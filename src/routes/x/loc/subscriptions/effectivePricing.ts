import type { db } from "@/db/db";
import { memberSubscriptions } from "@/subtrees/schemas";
import { eq } from "drizzle-orm";

// Accepts a transaction so a caller can price rows it has not committed yet.
type PricingReader = Pick<typeof db, "query">;

export async function resolveInitialSubscriptionPricing(database: PricingReader, memberSubscriptionId: string) {
  const subscription = await database.query.memberSubscriptions.findFirst({
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

  const { pricing, bundlePurchase, bundleComponent } = subscription;
  const bundlePrice = bundlePurchase && ["pending", "active"].includes(bundlePurchase.status)
    ? bundleComponent?.priceOverride ?? null
    : null;

  if (!bundlePurchase || !bundleComponent || bundlePrice === null) {
    return {
      basePricing: pricing,
      pricing,
      pricingSource: { type: "base" as const },
    };
  }

  return {
    basePricing: pricing,
    pricing: {
      ...pricing,
      price: bundlePrice,
    },
    pricingSource: {
      type: "bundle" as const,
      bundlePurchaseId: bundlePurchase.id,
      bundleComponentId: bundleComponent.id,
    },
  };
}
