import { enqueueAddonJob } from "@/queues/subscriptionAddons";
import { getAddonPurchase, purchaseAddon } from "./subscriptionAddons";

// The HTTP status and message for each reason an add-on can't be added.
const addonPurchaseErrors = {
  "subscription-not-found": { code: 404, error: "Subscription not found" },
  "subscription-inactive": { code: 409, error: "Add-ons can only be added to an active subscription" },
  "addon-not-found": { code: 404, error: "Add-on not found" },
  "pricing-conflict": { code: 409, error: "This subscription already has a different add-on price" },
} as const;

/** Adds an add-on to a subscription and queues its first charge. Adding one the
 * subscription already has returns that purchase. */
export async function addAddon(locationId: string, subscriptionId: string, addonId: string) {
  const result = await purchaseAddon(locationId, subscriptionId, addonId);

  if (result.status !== "created" && result.status !== "already-purchased") {
    return { status: "rejected" as const, ...addonPurchaseErrors[result.status] };
  }

  await enqueueAddonJob("activate", result.purchaseId);
  const purchase = await getAddonPurchase(locationId, subscriptionId, result.purchaseId);

  if (!purchase) throw new Error("Subscription add-on purchase was not found after creation");

  return { status: result.status, purchase };
}
