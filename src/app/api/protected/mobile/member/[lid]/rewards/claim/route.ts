
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { authenticateMember } from '@/libs/utils';
import { memberRewards, members } from '@/db/schemas';
import { eq } from 'drizzle-orm';


export async function POST(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
  const params = await props.params;
  const data: any = await req.json()
  try {

    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;
    const member = await db.query.members.findFirst({
      where: (members, { eq }) => eq(members.id, Number(memberId)),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reward = await db.query.rewards.findFirst({
      where: (reward, { eq, and }) => and(eq(reward.locationId, params.lid), eq(reward.id, data.rewardId)),
      with: {
        claims: {
          where: (claims, { eq }) => eq(claims.memberId, Number(memberId)),
        },
      },
    });

    if(!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if(!(reward.claims.length < reward.limitPerMember && member.currentPoints >= reward.requiredPoints))
      return NextResponse.json({ error: "This reward can't be claimed right now." }, { status: 400 });

    await db.transaction(async (trx) => {
      const [rewardClaim] = await trx.insert(memberRewards).values({
        memberId: Number(memberId),
        rewardId: reward.id,
        previousPoints: member.currentPoints,
        status: 1,
        dateClaimed: new Date(),
      }).returning({ id: memberRewards.id });

      await trx.update(members).set({
        currentPoints: member.currentPoints - reward.requiredPoints
      }).where(eq(members.id, member.id));

    });
  
    return NextResponse.json("Claimed", { status: 200 });
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: err }, { status: 500 })
  }
}