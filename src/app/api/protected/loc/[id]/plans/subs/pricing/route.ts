import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlanPricing, memberPlans } from "@/db/schemas";
import { and, eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  try {
    const whereClause = planId
      ? eq(memberPlanPricing.memberPlanId, planId)
      : undefined;

    const pricing = await db.query.memberPlanPricing.findMany({
      where: whereClause,
      with: {
        plan: {
          columns: {
            id: true,
            name: true,
            locationId: true,
          },
        },
      },
    });

    const filteredPricing = planId
      ? pricing
      : pricing.filter((p) => p.plan?.locationId === id);

    return NextResponse.json(filteredPricing, { status: 200 });
  } catch (err) {
    console.error("Error fetching pricing:", err);
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const data = await req.json();

  const {
    memberPlanId,
    name,
    price,
    currency = "USD",
    interval,
    intervalThreshold = 1,
    expireInterval,
    expireThreshold,
    downpayment,
  } = data;

  if (!memberPlanId || !name || price === undefined) {
    return NextResponse.json(
      { error: "memberPlanId, name, and price are required" },
      { status: 400 }
    );
  }

  try {
    const plan = await db.query.memberPlans.findFirst({
      where: (plans, { eq, and }) =>
        and(eq(plans.id, memberPlanId), eq(plans.locationId, id)),
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    let stripePriceId: string | null = null;

    if (plan.stripeProductId) {
      const integration = await db.query.integrations.findFirst({
        where: (integrations, { eq, and }) =>
          and(
            eq(integrations.locationId, id),
            eq(integrations.service, "stripe")
          ),
      });

      if (integration) {
        try {
          const stripe = new MemberStripePayments(String(integration.id));
          const stripePrice = await stripe.createStripePrice(
            plan.stripeProductId,
            {
              name: `${plan.name} - ${name}`,
              price,
              currency,
              interval: interval || null,
              intervalThreshold: intervalThreshold || 1,
            },
            {
              locationId: id,
              planId: plan.id,
              vendorAccountId: integration.accountId,
            }
          );
          stripePriceId = stripePrice.id;
        } catch (stripeErr) {
          console.error("Failed to create Stripe price:", stripeErr);
        }
      }
    }

    const [pricing] = await db
      .insert(memberPlanPricing)
      .values({
        memberPlanId,
        name,
        price,
        currency,
        interval: interval || null,
        intervalThreshold: intervalThreshold || null,
        expireInterval: expireInterval || null,
        expireThreshold: expireThreshold || null,
        downpayment: downpayment || null,
        stripePriceId,
      })
      .returning();

    return NextResponse.json(pricing, { status: 201 });
  } catch (err) {
    console.error("Error creating pricing:", err);
    return NextResponse.json({ error: "Failed to create pricing" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const data = await req.json();

  const {
    pricingId,
    name,
    price,
    currency,
    interval,
    intervalThreshold,
    expireInterval,
    expireThreshold,
    downpayment,
  } = data;

  if (!pricingId) {
    return NextResponse.json({ error: "pricingId is required" }, { status: 400 });
  }

  try {
    const existingPricing = await db.query.memberPlanPricing.findFirst({
      where: eq(memberPlanPricing.id, pricingId),
      with: {
        plan: true,
      },
    });

    if (!existingPricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    if (existingPricing.plan?.locationId !== id) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    let newStripePriceId: string | null = existingPricing.stripePriceId;

    const priceChanged =
      price !== undefined && price !== existingPricing.price ||
      interval !== undefined && interval !== existingPricing.interval ||
      intervalThreshold !== undefined && intervalThreshold !== existingPricing.intervalThreshold ||
      currency !== undefined && currency !== existingPricing.currency;

    if (priceChanged && existingPricing.plan?.stripeProductId) {
      const integration = await db.query.integrations.findFirst({
        where: (integrations, { eq, and }) =>
          and(
            eq(integrations.locationId, id),
            eq(integrations.service, "stripe")
          ),
      });

      if (integration) {
        const stripe = new MemberStripePayments(String(integration.id));

        if (existingPricing.stripePriceId) {
          try {
            await stripe.archivePrice(existingPricing.stripePriceId);
          } catch (archiveErr) {
            console.error("Failed to archive old Stripe price:", archiveErr);
          }
        }

        try {
          const newStripePrice = await stripe.createStripePrice(
            existingPricing.plan.stripeProductId,
            {
              name: `${existingPricing.plan.name} - ${name || existingPricing.name}`,
              price: price ?? existingPricing.price,
              currency: currency || existingPricing.currency,
              interval: interval ?? existingPricing.interval,
              intervalThreshold: intervalThreshold ?? existingPricing.intervalThreshold ?? 1,
            },
            {
              locationId: id,
              planId: existingPricing.plan.id,
              vendorAccountId: integration.accountId,
            }
          );
          newStripePriceId = newStripePrice.id;
        } catch (stripeErr) {
          console.error("Failed to create new Stripe price:", stripeErr);
        }
      }
    }

    const [updatedPricing] = await db
      .update(memberPlanPricing)
      .set({
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(currency !== undefined && { currency }),
        ...(interval !== undefined && { interval }),
        ...(intervalThreshold !== undefined && { intervalThreshold }),
        ...(expireInterval !== undefined && { expireInterval }),
        ...(expireThreshold !== undefined && { expireThreshold }),
        ...(downpayment !== undefined && { downpayment }),
        stripePriceId: newStripePriceId,
        updated: new Date(),
      })
      .where(eq(memberPlanPricing.id, pricingId))
      .returning();

    return NextResponse.json(updatedPricing, { status: 200 });
  } catch (err) {
    console.error("Error updating pricing:", err);
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const { searchParams } = new URL(req.url);
  const pricingId = searchParams.get("pricingId");

  if (!pricingId) {
    return NextResponse.json({ error: "pricingId is required" }, { status: 400 });
  }

  try {
    const existingPricing = await db.query.memberPlanPricing.findFirst({
      where: eq(memberPlanPricing.id, pricingId),
      with: {
        plan: true,
      },
    });

    if (!existingPricing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    if (existingPricing.plan?.locationId !== id) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    if (existingPricing.stripePriceId) {
      const integration = await db.query.integrations.findFirst({
        where: (integrations, { eq, and }) =>
          and(
            eq(integrations.locationId, id),
            eq(integrations.service, "stripe")
          ),
      });

      if (integration) {
        try {
          const stripe = new MemberStripePayments(String(integration.id));
          await stripe.archivePrice(existingPricing.stripePriceId);
        } catch (archiveErr) {
          console.error("Failed to archive Stripe price:", archiveErr);
        }
      }
    }

    await db
      .delete(memberPlanPricing)
      .where(eq(memberPlanPricing.id, pricingId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Error deleting pricing:", err);
    return NextResponse.json({ error: "Failed to delete pricing" }, { status: 500 });
  }
}
