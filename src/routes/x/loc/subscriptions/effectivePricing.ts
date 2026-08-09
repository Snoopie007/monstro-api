import { db } from "@/db/db";
import { memberSubscriptions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

export async function resolveInitialSubscriptionPricing(memberSubscriptionId: string) {
  const subscription = await db.query.memberSubscriptions.findFirst({
    where: eq(memberSubscriptions.id, memberSubscriptionId),
    with: {
      pricing: true,
      bundlePurchase: { columns: { id: true, status: true } },
      bundleComponent: { columns: { id: true, priceOverride: true } },
    },
  });
  if (!subscription?.pricing) {
    throw new Error(`Subscription ${memberSubscriptionId} has no base pricing`);
  }

  const bundleApplies = subscription.bundlePurchase
    && ["pending", "active"].includes(subscription.bundlePurchase.status)
    && subscription.bundleComponent?.priceOverride !== null
    && subscription.bundleComponent?.priceOverride !== undefined;
  if (!bundleApplies) {
    return {
      basePricing: subscription.pricing,
      pricing: subscription.pricing,
      pricingSource: { type: "base" as const },
    };
  }

  return {
    basePricing: subscription.pricing,
    pricing: {
      ...subscription.pricing,
      price: subscription.bundleComponent!.priceOverride!,
    },
    pricingSource: {
      type: "bundle" as const,
      bundlePurchaseId: subscription.bundlePurchase!.id,
      bundleComponentId: subscription.bundleComponent!.id,
    },
  };
}
