import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { memberPackages, memberPlanPricing, memberPlans, memberSubscriptions } from "@/db/schemas";
import { and, count, eq, inArray, or } from "drizzle-orm";

// Active statuses that count as "having members"
const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "paused"] as const;
const ACTIVE_PACKAGE_STATUSES = ["active", "incomplete"] as const;

async function getActiveMemberCount(planId: string): Promise<number> {
  // Get all pricing IDs for this plan
  const pricingIds = await db
    .select({ id: memberPlanPricing.id })
    .from(memberPlanPricing)
    .where(eq(memberPlanPricing.memberPlanId, planId));

  const pricingIdList = pricingIds.map((p) => p.id);

  if (pricingIdList.length === 0) return 0;

  // Count active subscriptions using raw SQL for type safety
  const subCount = await db
    .select({ count: count() })
    .from(memberSubscriptions)
    .where(
      and(
        inArray(memberSubscriptions.memberPlanPricingId, pricingIdList),
        or(
          ...ACTIVE_SUBSCRIPTION_STATUSES.map((status) =>
            eq(memberSubscriptions.status, status)
          )
        )
      )
    );

  // Count active packages using raw SQL for type safety
  const pkgCount = await db
    .select({ count: count() })
    .from(memberPackages)
    .where(
      and(
        inArray(memberPackages.memberPlanPricingId, pricingIdList),
        or(
          ...ACTIVE_PACKAGE_STATUSES.map((status) =>
            eq(memberPackages.status, status)
          )
        )
      )
    );

  return (subCount[0]?.count || 0) + (pkgCount[0]?.count || 0);
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await props.params;
  const { archived } = await req.json();

  try {
    // Get current plan state
    const plan = await db.query.memberPlans.findFirst({
      where: (plan, { eq }) => eq(plan.id, pid),
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // If trying to archive, check for active members
    if (archived === true) {
      const activeMemberCount = await getActiveMemberCount(pid);
      if (activeMemberCount > 0) {
        return NextResponse.json(
          { error: "Cannot archive plan with active members" },
          { status: 400 }
        );
      }
    }

    // Update the archived status
    await db
      .update(memberPlans)
      .set({
        archived,
        updated: new Date(),
      })
      .where(eq(memberPlans.id, pid));

    return NextResponse.json(
      { success: true, archived },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error archiving plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan archive status" },
      { status: 500 }
    );
  }
}
