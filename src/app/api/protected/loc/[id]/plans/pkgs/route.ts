import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlans, memberPlanPricing, planPrograms } from "@/db/schemas";

// Type for pricing option input (packages use single pricing for now)
type PricingOptionInput = {
  name: string;
  price: number;
  currency?: string;
  expireInterval?: "day" | "week" | "month" | "year" | null;
  expireThreshold?: number | null;
  downpayment?: number;
};

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const pkgs = await db.query.memberPlans.findMany({
      where: (memberPlans, { eq, and }) =>
        and(
          eq(memberPlans.locationId, params.id),
          eq(memberPlans.type, "one-time")
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

    return NextResponse.json(pkgs, { status: 200 });
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

    const plan = await db.transaction(async (tx) => {
      // Step 1: Create the plan (package type)
      const [plan] = await tx
        .insert(memberPlans)
        .values({
          ...data,
          locationId: params.id,
          type: "one-time",
        })
        .returning({ id: memberPlans.id, name: memberPlans.name });

      // Step 2: Create pricing options for the package
      // For packages, interval fields are ignored (one-time purchase)
      const pricingRecords = [];
      for (const pricingOption of pricingOptions as PricingOptionInput[]) {
        const [pricingRecord] = await tx
          .insert(memberPlanPricing)
          .values({
            memberPlanId: plan.id,
            name: pricingOption.name,
            price: pricingOption.price,
            currency: pricingOption.currency || "USD",
            // Packages don't use billing cycle (one-time purchase)
            interval: null,
            intervalThreshold: null,
            expireInterval: pricingOption.expireInterval || null,
            expireThreshold: pricingOption.expireThreshold || null,
            downpayment: pricingOption.downpayment ? pricingOption.downpayment : null,
            stripePriceId: null, // Packages don't use Stripe recurring prices
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
