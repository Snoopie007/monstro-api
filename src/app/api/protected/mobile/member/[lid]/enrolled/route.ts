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
        plan: {
          columns: {
            id : true,
            name: true,
            description: true,
            familyMemberLimit: true,
            price: true,
            currency: true,
            type: true,
            family: true,
        },
          with: {
            planPrograms: {
              with: {
                program: {
                  with: {
                    sessions: true
                  }
                }
              }

            }
          }
        }
      }
    });
    return NextResponse.json(subscriptions, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 })
  }
}