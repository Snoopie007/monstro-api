import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberSubscriptions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

type Params = {
  id: string;
  mid: string;
  sid: string;
};

/**
 * GET /api/protected/loc/[id]/members/[mid]/subs/[sid]/credits
 * 
 * Get make-up credits info for a subscription
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<Params> }
) {
  const params = await props.params;

  try {
    const subscription = await db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.id, params.sid),
      with: {
        pricing: {
          with: {
            plan: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const planMakeUpCredits = subscription.pricing?.plan?.makeUpCredits ?? 0;
    const usedMakeUpCredits = subscription.makeUpCredits;
    const remaining = Math.max(0, planMakeUpCredits - usedMakeUpCredits);

    return NextResponse.json({
      used: usedMakeUpCredits,
      limit: planMakeUpCredits,
      remaining,
      allowCarryOver: subscription.allowMakeUpCarryOver,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch credits info" },
      { status: 500 }
    );
  }
}


