import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberPlans, planPrograms } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";

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

  const { programs, ...data } = await req.json();

  try {
    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq }) =>
        and(
          eq(integrations.locationId, params.id),
          eq(integrations.service, "stripe")
        ),
    });

    const plan = await db.transaction(async (tx) => {
      const [createdPlan] = await tx
        .insert(memberPlans)
        .values({
          ...data,
          locationId: params.id,
        })
        .returning();

      let stripeProductId: string | null = null;

      if (data.type === "recurring" && integration) {
        try {
          const stripe = new MemberStripePayments(String(integration.id));
          const stripeProduct = await stripe.createStripeProductOnly(
            {
              name: createdPlan.name,
              description: createdPlan.description || "",
            },
            {
              locationId: params.id,
              planId: createdPlan.id,
              vendorAccountId: integration.accountId,
            }
          );
          stripeProductId = stripeProduct.id;

          if (stripeProductId) {
            await tx
              .update(memberPlans)
              .set({ stripeProductId })
              .where(eq(memberPlans.id, createdPlan.id));
          }
        } catch (stripeError) {
          console.error("Failed to create Stripe product:", stripeError);
        }
      }

      if (programs && programs.length > 0) {
        await tx.insert(planPrograms).values(
          programs.map((program: string) => ({
            planId: createdPlan.id,
            programId: program,
          }))
        );
      }

      return { ...createdPlan, stripeProductId };
    });

    return NextResponse.json(plan, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
