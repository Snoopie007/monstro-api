import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { serviceApiClient } from "@/libs/api/server";
import { format, subDays, addHours } from "date-fns";

type Params = {
  id: string;
};

export async function GET(req: Request, props: { params: Promise<Params> }) {
  const { id } = await props.params;

  try {
    const reservationsList = await db.query.reservations.findMany({
      where: (reservation, { eq }) => eq(reservation.locationId, id),
    });

    return NextResponse.json(
      { reservations: reservationsList },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, props: { params: Promise<Params> }) {
  const body = await req.json();
  const { id } = await props.params;

  // Handle multiple members (new format) or single member (legacy format)
  const memberIds = body.memberIds || (body.memberId ? [body.memberId] : []);
  const { sessionId, startDate, subscriptionId, packageId } = body;

  if (!memberIds || memberIds.length === 0) {
    return NextResponse.json(
      { error: "At least one member ID is required" },
      { status: 400 }
    );
  }

  try {
    // First, fetch the session with program info to get all denormalized data
    const session = await db.query.programSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
      with: {
        program: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate endOn based on startDate and session duration
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(
      startDateTime.getTime() + session.duration * 60000
    );

    // For multiple members, we need to get their subscription/package info
    const reservationsToInsert = [];

    for (const memberId of memberIds) {
      let memberSubscriptionId = subscriptionId || null;
      let memberPackageId = packageId || null;

      // If no specific subscription/package provided, try to find the member's active ones
      if (!memberSubscriptionId && !memberPackageId) {
        // Get the program's plan IDs
        const programWithPlans = await db.query.programs.findFirst({
          where: (p, { eq }) => eq(p.id, session.programId),
          with: {
            planPrograms: true,
          },
        });

        if (programWithPlans) {
          const planIds = programWithPlans.planPrograms.map((pp) => pp.planId);

          const activeSubscriptions =
            await db.query.memberSubscriptions.findMany({
              where: (s, { eq, and }) =>
                and(
                  eq(s.memberId, memberId),
                  eq(s.locationId, id),
                  eq(s.status, "active")
                ),
              with: {
                pricing: {
                  with: {
                    plan: { columns: { id: true } },
                  },
                },
              },
            });

          const matchingSubscription = activeSubscriptions.find(
            (sub) => sub.pricing?.plan?.id && planIds.includes(sub.pricing.plan.id)
          );

          if (matchingSubscription) {
            memberSubscriptionId = matchingSubscription.id;
          } else {
            const activePackages = await db.query.memberPackages.findMany({
              where: (p, { eq, and }) =>
                and(
                  eq(p.memberId, memberId),
                  eq(p.locationId, id),
                  eq(p.status, "active")
                ),
              with: {
                pricing: {
                  with: {
                    plan: { columns: { id: true } },
                  },
                },
              },
            });

            const matchingPackage = activePackages.find(
              (pkg) => pkg.pricing?.plan?.id && planIds.includes(pkg.pricing.plan.id)
            );

            if (matchingPackage) {
              memberPackageId = matchingPackage.id;
            }
          }
        }
      }

      reservationsToInsert.push({
        startOn: startDateTime,
        endOn: endDateTime,
        memberSubscriptionId,
        memberPackageId,
        sessionId,
        locationId: id,
        memberId,
        // Denormalized session/program fields
        programId: session.programId,
        programName: session.program?.name,
        sessionTime: session.time,
        sessionDuration: session.duration,
        sessionDay: session.day,
        staffId: session.staffId,
        status: 'confirmed' as const,
      });
    }

    // Insert all reservations and get the created reservation IDs
    const createdReservations = await db.insert(reservations).values(reservationsToInsert).returning();

    // Schedule class reminder emails (only for planId >= 2)
    try {
      const locationState = await db.query.locationState.findFirst({
        where: (ls, { eq }) => eq(ls.locationId, id)
      });

      if (locationState?.planId && locationState.planId >= 2) {
        // Fetch location details and session program info
        const location = await db.query.locations.findFirst({
          where: (l, { eq }) => eq(l.id, id)
        });

        const program = await db.query.programs.findFirst({
          where: (p, { eq }) => eq(p.id, session.programId)
        });

        if (location && program) {
          const apiClient = serviceApiClient();

          // Schedule emails for each created reservation
          for (const reservation of createdReservations) {
            // Fetch member details
            const member = await db.query.members.findFirst({
              where: (m, { eq }) => eq(m.id, reservation.memberId)
            });

            if (member) {
              const startOn = reservation.startOn;
              const endOn = reservation.endOn;
              const now = new Date();
              
              // Format the day and time for display
              const dayTime = format(startOn, "EEEE, MMMM d 'at' h:mm a");

              // Calculate when to send emails
              const upcomingReminderTime = subDays(startOn, 3);
              const missedClassTime = addHours(endOn, 1);

              // Fetch instructor data if available
              let instructor = null;
              if (session.staffId) {
                const staff = await db.query.staffs.findFirst({
                  where: (s, { eq }) => eq(s.id, session.staffId as string),
                });
                if (staff) {
                  instructor = {
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                  };
                }
              }

              const emailData = {
                member: {
                  firstName: member.firstName || '',
                  lastName: member.lastName || '',
                },
                session: {
                  programName: program.name,
                  dayTime,
                },
                location: {
                  name: location.name || '',
                  address: location.address || '',
                },
              };

              // For missed class email - updated to match new template interface
              const missedClassEmailData = {
                member: {
                  id: member.id,
                  firstName: member.firstName || '',
                  lastName: member.lastName || '',
                  email: member.email || '',
                },
                class: {
                  name: program.name,
                  description: program.description || undefined,
                  startTime: startOn.toISOString(),
                  endTime: endOn.toISOString(),
                  instructor,
                },
                location: {
                  id: location.id,
                  name: location.name || '',
                  address: location.address || '',
                  email: location.email || undefined,
                  phone: location.phone || undefined,
                },
              };

              // Schedule upcoming class reminder
              if (startOn > now) {
                // Class is in the future
                let reminderSendTime: Date;
                
                if (upcomingReminderTime > now) {
                  // Class is 3+ days away - schedule for 3 days before
                  reminderSendTime = upcomingReminderTime;
                  console.log(`📧 Scheduled upcoming class reminder for 3 days before ${dayTime}`);
                } else {
                  // Class is < 3 days away - send immediately
                  reminderSendTime = now;
                  console.log(`📧 Sending upcoming class reminder immediately (class is < 3 days away)`);
                }

                await apiClient.post('/protected/locations/email', {
                  recipient: member.email,
                  subject: `Reminder: ${program.name} class coming up`,
                  template: 'ClassReminderEmail',
                  data: emailData,
                  sendAt: reminderSendTime.toISOString(),
                  jobId: `class-reminder-${reservation.id}`,
                });
              } else {
                console.log(`⏭️ Skipping upcoming reminder - class is in the past`);
              }

              // Schedule missed class email (1 hour after class ends)
              await apiClient.post('/protected/locations/email', {
                recipient: member.email,
                subject: `We missed you at ${program.name}`,
                template: 'MissedClassEmail',
                data: missedClassEmailData,
                sendAt: missedClassTime.toISOString(),
                jobId: `missed-class-${reservation.id}`,
              });

              console.log(`📧 Scheduled class reminder emails for reservation ${reservation.id}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling class reminder emails:', error);
      // Don't fail the reservation if email scheduling fails
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${memberIds.length} member(s) to session`,
        count: memberIds.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error creating reservations:", err);
    return NextResponse.json(
      { error: "Failed to create reservations" },
      { status: 500 }
    );
  }
}
