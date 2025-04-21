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

    console.log("subscriptions", subscriptions)
    const allSessions: any[] = [];
    const allProgarms: any[] = [];


    subscriptions.forEach(subscription => {
      allProgarms.push(subscription.plan.program);
      subscription.reservations.forEach((reservation: any) => {
        allSessions.push(reservation);
      });
    });
    // console.log(allSessions)
    allProgarms.forEach((program) => {
        program.sessions.forEach((session: any) => {
          session.isEnrolled = allSessions.findIndex((s: any) => s.sessionId === session.id) !== -1;
        });
    });

    return NextResponse.json(allProgarms, { status: 200 })
  }
  catch (err) {
    // console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}
