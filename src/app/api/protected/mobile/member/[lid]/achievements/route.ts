
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { achievements } from '@/db/schemas';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
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

    const achievements = await db.query.achievements.findMany({
      where: (achievements, { eq }) => eq(achievements.locationId, params.lid),
      with: {
        actions: {
          with: {
            action: true
          }
        }
      }
    });
    const flattenedAchievements = achievements.map((achievement) => ({
      ...achievement,
      actions: achievement.actions.map(({ action, ...rest }) => ({
        ...rest,
        ...action,
      })),
    }));

    return NextResponse.json(flattenedAchievements, { status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}