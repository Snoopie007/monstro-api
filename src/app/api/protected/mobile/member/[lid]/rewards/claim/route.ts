import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { authenticateMember } from "@/libs/utils";
import { memberLocations, memberRewards } from "@/db/schemas";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ lid: string }> }
) {
  const params = await props.params;
  const data: any = await req.json();
  try {
    const authMember = authenticateMember(req);
    const memberId = authMember.member?.id;

    const ml = await db.query.memberLocations.findFirst({
      where: (memberLocation, { eq, and }) =>
        and(
          eq(memberLocation.memberId, memberId),
          eq(memberLocation.locationId, params.lid)
        ),
      with: {
        member: true,
      },
    });

    if (!ml) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reward = await db.query.rewards.findFirst({
      where: (reward, { eq, and }) =>
        and(eq(reward.locationId, params.lid), eq(reward.id, data.rewardId)),
      with: {
        claims: {
          where: (claims, { eq }) => eq(claims.memberId, memberId),
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (
      !(
        reward.claims.length < reward.limitPerMember &&
        ml.points >= reward.requiredPoints
      )
    )
      return NextResponse.json(
        { error: "This reward can't be claimed right now." },
        { status: 400 }
      );

    await db.transaction(async (trx) => {
      await trx.insert(memberRewards).values({
        memberId: memberId,
        rewardId: reward.id,
        previousPoints: ml.points,
        dateClaimed: new Date(),
      });

      await trx
        .update(memberLocations)
        .set({
          points: ml.points - reward.requiredPoints,
        })
        .where(
          and(
            eq(memberLocations.memberId, memberId),
            eq(memberLocations.locationId, params.lid)
          )
        );
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
