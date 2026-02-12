import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlanPricing, memberPlans, memberPackages } from "@subtrees/schemas";
import { eq, and, count, or } from "drizzle-orm";
import { ACTIVE_PACKAGE_STATUSES } from "../../constants";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, props: Props) {
  const { id } = await props.params;
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  try {
    if (planId) {
      const plan = await db.query.memberPlans.findFirst({
        where: and(
          eq(memberPlans.id, planId),
          eq(memberPlans.locationId, id),
          eq(memberPlans.type, "one-time")
        ),
      });

      if (!plan) {
        return NextResponse.json(
          { error: "Package plan not found" },
          { status: 404 }
        );
      }

      const pricingOptions = await db.query.memberPlanPricing.findMany({
        where: eq(memberPlanPricing.memberPlanId, planId),
        orderBy: (pricing, { asc }) => [asc(pricing.created)],
      });

      return NextResponse.json(pricingOptions, { status: 200 });
    }

    const plans = await db.query.memberPlans.findMany({
      where: and(
        eq(memberPlans.locationId, id),
        eq(memberPlans.type, "one-time")
      ),
      with: {
        pricingOptions: true,
      },
    });

    const allPricing = plans.flatMap((plan) =>
      plan.pricingOptions.map((pricing) => ({
        ...pricing,
        planName: plan.name,
      }))
    );

    return NextResponse.json(allPricing, { status: 200 });
  } catch (err) {
    console.error("Error fetching package pricing:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: Props) {
  const { id } = await props.params;
  const body = await req.json();

  const {
    memberPlanId,
    name,
    price,
    currency,
    expireInterval,
    expireThreshold,
    downpayment,
  } = body;

  try {
    if (!memberPlanId) {
      return NextResponse.json(
        { error: "memberPlanId is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || typeof price !== "number") {
      return NextResponse.json(
        { error: "price is required and must be a number" },
        { status: 400 }
      );
    }

    const plan = await db.query.memberPlans.findFirst({
      where: and(
        eq(memberPlans.id, memberPlanId),
        eq(memberPlans.locationId, id)
      ),
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    if (plan.type !== "one-time") {
      return NextResponse.json(
        { error: "This endpoint is only for package (one-time) plans" },
        { status: 400 }
      );
    }

    const [pricing] = await db.transaction(async (tx) => {
      return await tx
        .insert(memberPlanPricing)
        .values({
          memberPlanId,
          name,
          price,
          currency: currency || plan.currency || "USD",
          interval: null,
          intervalThreshold: null,
          expireInterval: expireInterval || null,
          expireThreshold: expireThreshold || null,
          downpayment: downpayment || null,
          stripePriceId: null,
        })
        .returning();
    });

    return NextResponse.json(pricing, { status: 201 });
  } catch (err) {
    console.error("Error creating package pricing:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: Props) {
  const { id: locationId } = await props.params;
  const body = await req.json();

  const {
    id: pricingId,
    name,
    price,
    currency,
    expireInterval,
    expireThreshold,
    downpayment,
  } = body;

  try {
    if (!pricingId) {
      return NextResponse.json(
        { error: "Pricing id is required" },
        { status: 400 }
      );
    }

    const existingPricing = await db.query.memberPlanPricing.findFirst({
      where: eq(memberPlanPricing.id, pricingId),
      with: {
        plan: true,
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { error: "Pricing option not found" },
        { status: 404 }
      );
    }

    if (existingPricing.plan.locationId !== locationId) {
      return NextResponse.json(
        { error: "Pricing option not found in this location" },
        { status: 404 }
      );
    }

    if (existingPricing.plan.type !== "one-time") {
      return NextResponse.json(
        { error: "This endpoint is only for package (one-time) plans" },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof memberPlanPricing.$inferInsert> = {
      updated: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (currency !== undefined) updateData.currency = currency;
    if (expireInterval !== undefined) updateData.expireInterval = expireInterval;
    if (expireThreshold !== undefined) updateData.expireThreshold = expireThreshold;
    if (downpayment !== undefined) updateData.downpayment = downpayment;

    const [updatedPricing] = await db.transaction(async (tx) => {
      return await tx
        .update(memberPlanPricing)
        .set(updateData)
        .where(eq(memberPlanPricing.id, pricingId))
        .returning();
    });

    return NextResponse.json(updatedPricing, { status: 200 });
  } catch (err) {
    console.error("Error updating package pricing:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: Props) {
  const { id: locationId } = await props.params;
  const body = await req.json();
  const { id: pricingId } = body;

  try {
    if (!pricingId) {
      return NextResponse.json(
        { error: "Pricing id is required" },
        { status: 400 }
      );
    }

    const existingPricing = await db.query.memberPlanPricing.findFirst({
      where: eq(memberPlanPricing.id, pricingId),
      with: {
        plan: true,
      },
    });

    if (!existingPricing) {
      return NextResponse.json(
        { error: "Pricing option not found" },
        { status: 404 }
      );
    }

    if (existingPricing.plan.locationId !== locationId) {
      return NextResponse.json(
        { error: "Pricing option not found in this location" },
        { status: 404 }
      );
    }

    if (existingPricing.plan.type !== "one-time") {
      return NextResponse.json(
        { error: "This endpoint is only for package (one-time) plans" },
        { status: 400 }
      );
    }

    const activePackageCount = await db
      .select({ count: count() })
      .from(memberPackages)
      .where(
        and(
          eq(memberPackages.memberPlanPricingId, pricingId),
          or(
            ...ACTIVE_PACKAGE_STATUSES.map((status) =>
              eq(memberPackages.status, status)
            )
          )
        )
      );

    if (Number(activePackageCount[0]?.count || 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete pricing option with active packages" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(memberPlanPricing)
        .where(eq(memberPlanPricing.id, pricingId));
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error deleting package pricing:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
