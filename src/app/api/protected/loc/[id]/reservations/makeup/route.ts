import { db } from "@/db/db";
import { eq, sql } from "drizzle-orm";
import { reservations, programSessions, memberSubscriptions, memberPackages, members, locations } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";
import type { CreateMakeUpClassInput } from "@/types/reservation";
import { sendMakeupConfirmationNotification } from "@/libs/notifications/MakeupConfirmation";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/protected/loc/[id]/reservations/makeup
 * 
 * Create a make-up class reservation for a missed session
 * 
 * Body:
 * - memberId: string - Member ID
 * - locationId: string - Location ID
 * - startOn: string - Start time (ISO string)
 * - endOn: string - End time (ISO string)
 * - originalReservationId: string - Reference to the original missed reservation
 * - memberSubscriptionId?: string - Subscription to use
 * - memberPackageId?: string - Package to use
 * - sessionId?: string - Optional session to bind to
 * - programId?: string - Program ID (required if no sessionId)
 * - programName?: string - Program name (required if no sessionId)
 * - staffId?: string - Optional staff ID
 */
export async function POST(req: NextRequest, props: Props) {
  const params = await props.params;
  const body: CreateMakeUpClassInput = await req.json();

  const {
    memberId,
    startOn,
    endOn,
    originalReservationId,
    memberSubscriptionId,
    memberPackageId,
    sessionId,
    programId,
    programName,
    staffId,
  } = body;

  // Validate required fields
  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required" },
      { status: 400 }
    );
  }

  if (!startOn || !endOn) {
    return NextResponse.json(
      { error: "startOn and endOn are required" },
      { status: 400 }
    );
  }

  if (!originalReservationId) {
    return NextResponse.json(
      { error: "originalReservationId is required for make-up classes" },
      { status: 400 }
    );
  }

  try {
    // Verify the original reservation exists and belongs to this member
    const originalReservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, originalReservationId),
      with: {
        session: {
          with: {
            program: true,
          },
        },
      },
    });

    if (!originalReservation) {
      return NextResponse.json(
        { error: "Original reservation not found" },
        { status: 404 }
      );
    }

    if (originalReservation.memberId !== memberId) {
      return NextResponse.json(
        { error: "Original reservation does not belong to this member" },
        { status: 403 }
      );
    }

    // Check make-up credits limit based on subscription or package
    const subId = memberSubscriptionId || originalReservation.memberSubscriptionId;
    const pkgId = memberPackageId || originalReservation.memberPackageId;
    
    let planMakeUpCredits = 0;
    let usedMakeUpCredits = 0;
    
    if (subId) {
      const subscription = await db.query.memberSubscriptions.findFirst({
        where: eq(memberSubscriptions.id, subId),
        with: {
          pricing: {
            with: {
              plan: true,
            },
          },
        },
      });
      
      if (subscription) {
        usedMakeUpCredits = subscription.makeUpCredits;
        planMakeUpCredits = subscription.pricing?.plan?.makeUpCredits ?? 0;
      }
    } else if (pkgId) {
      const pkg = await db.query.memberPackages.findFirst({
        where: eq(memberPackages.id, pkgId),
        with: {
          pricing: {
            with: {
              plan: true,
            },
          },
        },
      });
      
      if (pkg) {
        usedMakeUpCredits = pkg.makeUpCredits;
        planMakeUpCredits = pkg.pricing?.plan?.makeUpCredits ?? 0;
      }
    }
    
    // Check if member has available make-up credits
    if (planMakeUpCredits > 0 && usedMakeUpCredits >= planMakeUpCredits) {
      return NextResponse.json(
        { 
          error: "No make-up credits remaining",
          used: usedMakeUpCredits,
          limit: planMakeUpCredits,
        },
        { status: 400 }
      );
    }

    // Determine program info - from sessionId, provided values, or original reservation
    let resolvedProgramId = programId;
    let resolvedProgramName = programName;
    let resolvedSessionTime: string | undefined;
    let resolvedSessionDuration: number | undefined;
    let resolvedSessionDay: number | undefined;
    let resolvedStaffId = staffId;

    if (sessionId) {
      // If sessionId provided, get session details
      const session = await db.query.programSessions.findFirst({
        where: eq(programSessions.id, sessionId),
        with: {
          program: true,
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }

      resolvedProgramId = session.programId;
      resolvedProgramName = session.program?.name;
      resolvedSessionTime = session.time;
      resolvedSessionDuration = session.duration;
      resolvedSessionDay = session.day;
      resolvedStaffId = session.staffId || staffId;
    } else {
      // Use provided program info or fall back to original reservation
      if (!resolvedProgramId && originalReservation.programId) {
        resolvedProgramId = originalReservation.programId;
      }
      if (!resolvedProgramName && originalReservation.programName) {
        resolvedProgramName = originalReservation.programName;
      }
      
      // If still no program info, try to get from original session
      if (!resolvedProgramId && originalReservation.session?.programId) {
        resolvedProgramId = originalReservation.session.programId;
        resolvedProgramName = originalReservation.session.program?.name;
      }
    }

    // Calculate duration from start/end if not from session
    const startDateTime = new Date(startOn);
    const endDateTime = new Date(endOn);
    
    if (!resolvedSessionDuration) {
      resolvedSessionDuration = Math.round(
        (endDateTime.getTime() - startDateTime.getTime()) / 60000
      );
    }

    // Create the make-up class reservation and increment used credits
    const effectiveSubId = memberSubscriptionId || originalReservation.memberSubscriptionId;
    const effectivePkgId = memberPackageId || originalReservation.memberPackageId;
    
    const [makeUpReservation] = await db
      .insert(reservations)
      .values({
        sessionId: sessionId || null,
        memberId,
        locationId: params.id,
        startOn: startDateTime,
        endOn: endDateTime,
        memberSubscriptionId: effectiveSubId,
        memberPackageId: effectivePkgId,
        programId: resolvedProgramId,
        programName: resolvedProgramName,
        sessionTime: resolvedSessionTime,
        sessionDuration: resolvedSessionDuration,
        sessionDay: resolvedSessionDay,
        staffId: resolvedStaffId,
        isMakeUpClass: true,
        originalReservationId,
        status: 'confirmed',
      })
      .returning();

    // Increment make-up credits used on the subscription or package
    if (effectiveSubId) {
      await db
        .update(memberSubscriptions)
        .set({
          makeUpCredits: sql`${memberSubscriptions.makeUpCredits} + 1`,
          updated: new Date(),
        })
        .where(eq(memberSubscriptions.id, effectiveSubId));
    } else if (effectivePkgId) {
      await db
        .update(memberPackages)
        .set({
          makeUpCredits: sql`${memberPackages.makeUpCredits} + 1`,
          updated: new Date(),
        })
        .where(eq(memberPackages.id, effectivePkgId));
    }

    // Send confirmation notification
    const [member, location] = await Promise.all([
      db.query.members.findFirst({ where: eq(members.id, memberId) }),
      db.query.locations.findFirst({ where: eq(locations.id, params.id) }),
    ]);

    if (member?.email) {
      const creditsRemaining = planMakeUpCredits > 0 
        ? planMakeUpCredits - (usedMakeUpCredits + 1) 
        : undefined;

      sendMakeupConfirmationNotification(params.id, {
        memberId: member.id,
        memberEmail: member.email,
        memberFirstName: member.firstName,
        originalClass: {
          name: originalReservation.programName || originalReservation.session?.program?.name || 'Class',
          date: originalReservation.startOn.toISOString().split('T')[0],
          time: originalReservation.startOn.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          }),
        },
        makeupClass: {
          name: resolvedProgramName || 'Make-up Class',
          date: startDateTime.toISOString().split('T')[0],
          time: startDateTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          }),
        },
        creditsRemaining,
        locationName: location?.name || 'Your Studio',
        locationAddress: location?.address ?? undefined,
      }).catch(err => {
        console.error('Failed to send makeup confirmation notification:', err);
      });
    }

    return NextResponse.json(makeUpReservation, { status: 201 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to create make-up class";
    return NextResponse.json({ error }, { status: 500 });
  }
}

