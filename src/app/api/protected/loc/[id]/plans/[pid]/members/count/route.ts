import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { memberPackages, memberPlanPricing, memberSubscriptions } from "@/db/schemas";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { ACTIVE_SUBSCRIPTION_STATUSES, ACTIVE_PACKAGE_STATUSES } from "../../../constants";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await props.params;

  try {
    // Get all pricing IDs for this plan
    const pricingIds = await db
      .select({ id: memberPlanPricing.id })
      .from(memberPlanPricing)
      .where(eq(memberPlanPricing.memberPlanId, pid));

    const pricingIdList = pricingIds.map((p) => p.id);

    if (pricingIdList.length === 0) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    // Count active subscriptions
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

    // Count active packages
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

    const totalCount = Number(subCount[0]?.count || 0) + Number(pkgCount[0]?.count || 0);

    return NextResponse.json({ count: totalCount }, { status: 200 });
  } catch (error) {
    console.error("Error counting plan members:", error);
    return NextResponse.json(
      { error: "Failed to count plan members" },
      { status: 500 }
    );
  }
}
