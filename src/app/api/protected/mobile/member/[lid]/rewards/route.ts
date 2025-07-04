
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';


export async function GET(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
  const params = await props.params;
  try {

    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;

    const ml = await db.query.memberLocations.findFirst({
      where: (memberLocation, { eq, and }) => and(eq(memberLocation.memberId, memberId), eq(memberLocation.locationId, params.lid)),
    });

    if (!ml) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const rewards = await db.query.rewards.findMany({
      where: (rewards, { eq }) => eq(rewards.locationId, params.lid),
      with: {
        claims: {
          where: (claims, { eq }) => eq(claims.memberId, memberId),
        },
      },
    });

    const claimableRewards = rewards.map((reward) => {
      const memberClaimCount = reward.claims.length;
      const hasEnoughPoints = ml.points >= reward.requiredPoints;
      const withinLimit = memberClaimCount < reward.limitPerMember;
      const remainingClaims = reward.limitPerMember - memberClaimCount;

      return {
        ...reward,
        claimable: hasEnoughPoints && withinLimit,
        remainingClaims
      };
    });

    return NextResponse.json(claimableRewards, { status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}