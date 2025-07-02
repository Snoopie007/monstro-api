import { db } from "@/db/db";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
  const params = await props.params;
  const authMember = authenticateMember(req);

  try {
    // Get subscriptions and add type 'sub'
    const subscriptions = await db.query.memberSubscriptions.findMany({
      where: (memberSubscriptions, { eq, and }) => and(
        eq(memberSubscriptions.memberId, authMember.member?.id),
        eq(memberSubscriptions.locationId, params.lid),
        eq(memberSubscriptions.status, 'active')
      ),
      with: {
        plan: {
          columns: {
            id: true,
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
    }).then(subs => subs.map(sub => ({ ...sub, type: 'sub' })));

    // Get packages and add type 'pkg'
    const pkg = await db.query.memberPackages.findMany({
      where: (memberPackages, { eq, and }) => and(
        eq(memberPackages.memberId, authMember.member?.id),
        eq(memberPackages.locationId, params.lid),
        eq(memberPackages.status, 'active')
      ),
      with: {
        plan: {
          columns: {
            id: true,
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
    }).then(pkgs => pkgs.map(pkg => ({ ...pkg, type: 'pkg' })));

    // Combine both arrays with their respective types
    return NextResponse.json([...subscriptions, ...pkg], { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}