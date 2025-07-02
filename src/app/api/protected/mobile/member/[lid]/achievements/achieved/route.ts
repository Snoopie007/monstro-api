
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { achievements } from '@/db/schemas';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
  const params = await props.params;
  try {

    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;
    const member = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, memberId),
    });

    if (!member && !memberId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const achievements = await db.query.memberAchievements.findMany({
      where: (memberAchievements, { eq, and }) => and(eq(memberAchievements.memberId, memberId), eq(memberAchievements.locationId, params.lid)),
      with: {
        achievement: {
          with: {
            actions: {
              with: {
                action: true
              }
            }
          }
        }
      }
    });
    const flattenedAchievements = achievements.map(({ achievement, ...memberAchievement }) => ({
      ...memberAchievement,
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