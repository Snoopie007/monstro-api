import { db } from "@/db/db";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
  const params = await props.params;
  const authMember = authenticateMember(req);

  try {
    const subscriptions = await db.query.memberSubscriptions.findMany({
      where: (memberSubscriptions, { eq, and }) => and(
        eq(memberSubscriptions.memberId, Number(authMember.member?.id)),
        eq(memberSubscriptions.locationId, params.lid)
      ),
      with: {
        reservations: {
          with: {
            session: true
          }
        },
        plan: {
          with: {
            program: {
              with: {
                sessions: true
              }
            }
          }
        }
      }
    })

    const allSessions: any[] = [];
    const allPrograms: any[] = [];

    subscriptions.forEach(subscription => {
      
      const reservationCount = subscription.reservations.length;
      
      
      const programWithCount = {
        ...subscription.plan.program,
        reservationCount: reservationCount,
        totalSessions: subscription.plan.program.sessions.length
      };
      
      allPrograms.push(programWithCount);
      
      subscription.reservations.forEach((reservation: any) => {
        allSessions.push(reservation);
      });
    });

    allPrograms.forEach((program) => {
      program.sessions.forEach((session: any) => {
        session.isEnrolled = allSessions.findIndex((s: any) => s.sessionId === session.id) !== -1;
      });
    });

    return NextResponse.json(allPrograms, { status: 200 });
  }
  catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
