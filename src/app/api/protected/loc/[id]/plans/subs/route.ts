import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlans, memberPlanPricing, planPrograms } from "@/db/schemas";
import { and } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";

// Type for pricing option input
type PricingOptionInput = {
  name: string;
  price: number;
  currency?: string;
  interval?: "day" | "week" | "month" | "year";
  intervalThreshold?: number;
  expireInterval?: "day" | "week" | "month" | "year" | null;
  expireThreshold?: number | null;
  downpayment?: number;
};

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";

  try {
    const subs = await db.query.memberPlans.findMany({
      where: (memberPlans, { eq, and }) =>
        and(
          eq(memberPlans.locationId, params.id),
          eq(memberPlans.type, "recurring"),
          eq(memberPlans.archived, archived)
        ),
      with: {
        planPrograms: {
          with: {
            program: true,
          },
        },
        pricingOptions: true,
      },
    });

    return NextResponse.json(subs, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  const { pricingOptions, programs, ...data } = await req.json();

  try {
    // Validate that at least one pricing option is provided
    if (!pricingOptions || !Array.isArray(pricingOptions) || pricingOptions.length === 0) {
      return NextResponse.json(
        { error: "At least one pricing option is required" },
        { status: 400 }
      );
    }

    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq }) =>
        and(
          eq(integrations.locationId, params.id),
          eq(integrations.service, "stripe")
        ),
    });

    const plan = await db.transaction(async (tx) => {
      // Step 1: Create the plan
      const [plan] = await tx
        .insert(memberPlans)
        .values({
          ...data,
          locationId: params.id,
        })
        .returning({ id: memberPlans.id, name: memberPlans.name });

      // Step 2: Create pricing options for the plan
      const pricingRecords = [];
      for (const pricingOption of pricingOptions as PricingOptionInput[]) {
        let stripePriceId: string | null = null;

        // Create Stripe price if integration exists
        if (integration) {
          const stripe = new MemberStripePayments(String(integration.id));
          const stripePrice = await stripe.createStripeProduct(
            {
              name: `${plan.name} - ${pricingOption.name}`,
              description: data.description || "",
              price: pricingOption.price,
              currency: pricingOption.currency || "USD",
              interval: pricingOption.interval || "month",
              intervalThreshold: pricingOption.intervalThreshold || 1,
            },
            {
              locationId: params.id,
              planId: plan.id,
              vendorAccountId: integration.accountId,
            }
          );
          stripePriceId = stripePrice?.id || null;
        }

        const [pricingRecord] = await tx
          .insert(memberPlanPricing)
          .values({
            memberPlanId: plan.id,
            name: pricingOption.name,
            price: pricingOption.price,
            currency: pricingOption.currency || "USD",
            interval: pricingOption.interval || "month",
            intervalThreshold: pricingOption.intervalThreshold || 1,
            expireInterval: pricingOption.expireInterval || null,
            expireThreshold: pricingOption.expireThreshold || null,
            downpayment: pricingOption.downpayment ? pricingOption.downpayment : null,
            stripePriceId,
          })
          .returning();

        pricingRecords.push(pricingRecord);
      }

      // Step 3: Create program associations
      if (programs && programs.length > 0) {
        await tx.insert(planPrograms).values(
          programs.map((program: string) => ({
            planId: plan.id,
            programId: program,
          }))
        );
      }

      return { ...plan, pricingOptions: pricingRecords };
    });

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
