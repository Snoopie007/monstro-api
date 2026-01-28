import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/db";
import { memberPackages, memberPlanPricing, memberPlans, memberSubscriptions, planPrograms } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { ACTIVE_SUBSCRIPTION_STATUSES, ACTIVE_PACKAGE_STATUSES } from "../../constants";

async function getActiveMemberCount(planId: string): Promise<number> {
  // Get all pricing IDs for this plan
  const pricingIds = await db
    .select({ id: memberPlanPricing.id })
    .from(memberPlanPricing)
    .where(eq(memberPlanPricing.memberPlanId, planId));

  const pricingIdList = pricingIds.map((p) => p.id);

  if (pricingIdList.length === 0) return 0;

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

  return Number(subCount[0]?.count || 0) + Number(pkgCount[0]?.count || 0);
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await props.params;
  const { programs, pricingOptions, ...rest } = await req.json();

  try {
    const plan = await db.query.memberPlans.findFirst({
      where: (plan, { eq }) => eq(plan.id, pid),
      with: {
        planPrograms: true,
        pricingOptions: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check for active members
    const activeMemberCount = await getActiveMemberCount(pid);
    const hasMembers = activeMemberCount > 0;

    // Validate family member limit can only be increased
    if (
      rest.familyMemberLimit !== undefined &&
      rest.familyMemberLimit < (plan.familyMemberLimit || 0)
    ) {
      return NextResponse.json(
        { error: "Family member limit can only be increased, not decreased" },
        { status: 400 }
      );
    }

    // If there are members, reject changes to restricted fields
    if (hasMembers) {
      const restrictedFields = [
        'pricingOptions', 'contractId', 'intervalClassLimit', 
        'makeUpCredits', 'totalClassLimit', 'currency', 'billingAnchor'
      ];
      const attemptedRestricted = restrictedFields.filter(field => rest[field] !== undefined || pricingOptions !== undefined);
      
      if (attemptedRestricted.length > 0) {
        return NextResponse.json(
          { error: "Cannot modify restricted fields when plan has active members" },
          { status: 400 }
        );
      }
    }

    // Prepare program changes
    const newPrograms = programs.filter(
      (programId: string) =>
        !plan.planPrograms.some((program) => program.programId === programId)
    );

    const removedPrograms = plan.planPrograms.filter(
      (program) => !programs.includes(program.programId)
    );

    // Handle pricing options if provided and no members
    let pricingChanges = { new: [], modified: [], deleted: [] } as {
      new: any[];
      modified: any[];
      deleted: string[];
    };

    if (!hasMembers && pricingOptions && Array.isArray(pricingOptions)) {
      const existingPricing = plan.pricingOptions || [];
      const existingIds = existingPricing.map(p => p.id);
      const incomingIds = pricingOptions.filter((p: any) => p.id).map((p: any) => p.id);

      // Find new pricing options
      pricingChanges.new = pricingOptions.filter((p: any) => !p.id);

      // Find modified pricing options
      pricingChanges.modified = pricingOptions.filter((p: any) => {
        if (!p.id) return false;
        const existing = existingPricing.find(ep => ep.id === p.id);
        if (!existing) return false;
        return (
          existing.name !== p.name ||
          existing.price !== p.price ||
          existing.interval !== p.interval ||
          existing.intervalThreshold !== p.intervalThreshold ||
          existing.expireInterval !== p.expireInterval ||
          existing.expireThreshold !== p.expireThreshold ||
          existing.downpayment !== p.downpayment
        );
      });

      // Find deleted pricing options
      pricingChanges.deleted = existingIds.filter(id => !incomingIds.includes(id));
    }

    // Get Stripe integration if needed for subscription pricing
    let stripeIntegration = null;
    if (!hasMembers && plan.type === "recurring" && pricingOptions) {
      stripeIntegration = await db.query.integrations.findFirst({
        where: (integrations, { eq, and }) =>
          and(
            eq(integrations.locationId, id),
            eq(integrations.service, "stripe")
          ),
      });
    }

    // Execute all database operations in a transaction
    await db.transaction(async (tx) => {
      // Update plan fields
      const planUpdateData: any = { ...rest };
      
      // Handle billing anchor separately
      if (rest.billingAnchor !== undefined) {
        planUpdateData.billingAnchorConfig = rest.billingAnchor 
          ? { day_of_month: rest.billingAnchor }
          : {};
        delete planUpdateData.billingAnchor;
      }

      await tx
        .update(memberPlans)
        .set(planUpdateData)
        .where(eq(memberPlans.id, pid));

      // Handle program changes
      if (newPrograms.length > 0) {
        await tx
          .insert(planPrograms)
          .values(
            newPrograms.map((programId: string) => ({ planId: pid, programId }))
          );
      }

      if (removedPrograms.length > 0) {
        await tx.delete(planPrograms).where(
          inArray(
            planPrograms.programId,
            removedPrograms.map((program) => program.programId)
          )
        );
      }

      // Handle pricing changes if no members
      if (!hasMembers && pricingOptions) {
        // Delete removed pricing options
        if (pricingChanges.deleted.length > 0) {
          // Archive Stripe prices if subscription
          if (plan.type === "recurring" && stripeIntegration) {
            const stripe = new MemberStripePayments(String(stripeIntegration.id));
            for (const pricingId of pricingChanges.deleted) {
              const pricing = plan.pricingOptions?.find(p => p.id === pricingId);
              if (pricing?.stripePriceId) {
                try {
                  await stripe.archivePrice(pricing.stripePriceId);
                } catch (e) {
                  console.error("Failed to archive Stripe price:", e);
                }
              }
            }
          }
          
          await tx.delete(memberPlanPricing).where(
            inArray(memberPlanPricing.id, pricingChanges.deleted)
          );
        }

        // Add new pricing options
        for (const newPricing of pricingChanges.new) {
          let stripePriceId: string | null = null;

          // Create Stripe price for subscriptions if integration exists
          if (plan.type === "recurring" && stripeIntegration && newPricing.interval) {
            const stripe = new MemberStripePayments(String(stripeIntegration.id));
            try {
              const stripePrice = await stripe.createStripeProduct(
                {
                  name: `${plan.name} - ${newPricing.name}`,
                  description: plan.description || "",
                  price: newPricing.price,
                  currency: newPricing.currency || "USD",
                  interval: newPricing.interval,
                  intervalThreshold: newPricing.intervalThreshold || 1,
                },
                {
                  locationId: id,
                  planId: pid,
                  vendorAccountId: stripeIntegration.accountId,
                }
              );
              stripePriceId = stripePrice?.id || null;
            } catch (e) {
              console.error("Failed to create Stripe price:", e);
            }
          }

          await tx.insert(memberPlanPricing).values({
            memberPlanId: pid,
            name: newPricing.name,
            price: newPricing.price,
            currency: newPricing.currency || "USD",
            interval: plan.type === "recurring" ? newPricing.interval || "month" : null,
            intervalThreshold: plan.type === "recurring" ? newPricing.intervalThreshold || 1 : null,
            expireInterval: newPricing.expireInterval || null,
            expireThreshold: newPricing.expireThreshold || null,
            downpayment: newPricing.downpayment || null,
            stripePriceId,
          });
        }

        // Update modified pricing options
        for (const modifiedPricing of pricingChanges.modified) {
          const existing = plan.pricingOptions?.find(p => p.id === modifiedPricing.id);
          
          // For subscriptions with Stripe, archive old price and create new one
          if (plan.type === "recurring" && stripeIntegration && existing?.stripePriceId) {
            const stripe = new MemberStripePayments(String(stripeIntegration.id));
            try {
              await stripe.archivePrice(existing.stripePriceId);
              
              const newStripePrice = await stripe.createStripeProduct(
                {
                  name: `${plan.name} - ${modifiedPricing.name}`,
                  description: plan.description || "",
                  price: modifiedPricing.price,
                  currency: modifiedPricing.currency || "USD",
                  interval: modifiedPricing.interval,
                  intervalThreshold: modifiedPricing.intervalThreshold || 1,
                },
                {
                  locationId: id,
                  planId: pid,
                  vendorAccountId: stripeIntegration.accountId,
                }
              );
              
              await tx
                .update(memberPlanPricing)
                .set({
                  name: modifiedPricing.name,
                  price: modifiedPricing.price,
                  currency: modifiedPricing.currency || "USD",
                  interval: modifiedPricing.interval,
                  intervalThreshold: modifiedPricing.intervalThreshold || 1,
                  expireInterval: modifiedPricing.expireInterval || null,
                  expireThreshold: modifiedPricing.expireThreshold || null,
                  downpayment: modifiedPricing.downpayment || null,
                  stripePriceId: newStripePrice?.id || null,
                  updated: new Date(),
                })
                .where(eq(memberPlanPricing.id, modifiedPricing.id));
            } catch (e) {
              console.error("Failed to update Stripe price:", e);
            }
          } else {
            // For packages or without Stripe, just update the record
            await tx
              .update(memberPlanPricing)
              .set({
                name: modifiedPricing.name,
                price: modifiedPricing.price,
                currency: modifiedPricing.currency || "USD",
                interval: plan.type === "recurring" ? modifiedPricing.interval : null,
                intervalThreshold: plan.type === "recurring" ? modifiedPricing.intervalThreshold : null,
                expireInterval: modifiedPricing.expireInterval || null,
                expireThreshold: modifiedPricing.expireThreshold || null,
                downpayment: modifiedPricing.downpayment || null,
                updated: new Date(),
              })
              .where(eq(memberPlanPricing.id, modifiedPricing.id));
          }
        }
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
