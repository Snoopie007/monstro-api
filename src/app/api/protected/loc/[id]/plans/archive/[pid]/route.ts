import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { memberPackages, memberPlanPricing, memberPlans, memberSubscriptions } from "@subtrees/schemas";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { ACTIVE_SUBSCRIPTION_STATUSES, ACTIVE_PACKAGE_STATUSES } from "../../constants";

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await props.params;
  const { archived } = await req.json();

  try {
    // Wrap the check and update in a transaction to prevent race conditions
    await db.transaction(async (tx) => {
      // Get current plan state
      const [plan] = await tx
        .select()
        .from(memberPlans)
        .where(eq(memberPlans.id, pid));

      if (!plan) {
        throw new Error("Plan not found");
      }

      // If trying to archive, check for active members
      if (archived === true) {
        // Get all pricing IDs for this plan
        const pricingIds = await tx
          .select({ id: memberPlanPricing.id })
          .from(memberPlanPricing)
          .where(eq(memberPlanPricing.memberPlanId, pid));

        const pricingIdList = pricingIds.map((p) => p.id);

        if (pricingIdList.length > 0) {
          // Count active subscriptions
          const subCount = await tx
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

          // Count active packages
          const pkgCount = await tx
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

          const activeMemberCount = (subCount[0]?.count || 0) + (pkgCount[0]?.count || 0);

          if (activeMemberCount > 0) {
            throw new Error("Cannot archive plan with active members");
          }
        }
      }

      // Update the archived status
      await tx
        .update(memberPlans)
        .set({
          archived,
          updated: new Date(),
        })
        .where(eq(memberPlans.id, pid));
    });

    return NextResponse.json(
      { success: true, archived },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error archiving plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update plan archive status";
    const statusCode = errorMessage === "Plan not found" ? 404 : errorMessage === "Cannot archive plan with active members" ? 400 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
