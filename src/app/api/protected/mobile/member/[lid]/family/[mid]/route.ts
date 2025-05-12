import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { actions } from '@/db/schemas';

type Props = {
  lid: number,
  mid: number
}

export async function GET(req: NextRequest, props: { params: Promise<Props> }) {
  const params = await props.params;
  try {
    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;
    const member = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, Number(memberId)),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const family = await db.query.familyMembers.findFirst({
      where: (familyMembers, { eq, and }) => and(eq(familyMembers.relatedMemberId, params.mid)),
      with: {
        relatedMember: {
          with: {
            memberLocations: true,
            achievements: {
              with: {
                achievement: {
                  with: {
                    actions: true
                  }
                }
              }
            },
            packages: true,
            rewards: true,
            subscriptions: true,
           

          }
        }
      }
    });

    return NextResponse.json(family, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}