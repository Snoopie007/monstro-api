import type { Interval } from "../types";
import { nextBillingBoundary } from "./subscriptionBilling";

/** A canceled or expired add-on or bundle purchase is finished. */
export function hasEnded(status: string) {
  return status === "canceled" || status === "expired";
}

export const COLLECTING_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

/** An add-on purchase in one of these statuses is still open on its subscription. */
export const OPEN_ADDON_PURCHASE_STATUSES = ["pending", "active", "past_due"] as const;

/** Why an add-on period can't be collected now, or null when it can. The collector,
 * settlement and the worker's bundled renewal all ask this, so they agree on when billing stops. */
export function addonNotCollectible(
  addon: { status: string; cancelAt: Date | null },
  bundle: { status: string } | null | undefined,
  subscription: { status: string; cancelAt: Date | null } | null | undefined,
  now = new Date(),
): string | null {
  if (hasEnded(addon.status)) return `Subscription add-on is ${addon.status}`;
  if (bundle && hasEnded(bundle.status)) return `Bundle is ${bundle.status}`;

  // A past-due subscription still collects its add-ons.
  if (!subscription || !COLLECTING_SUBSCRIPTION_STATUSES.includes(subscription.status)) return "Subscription is not collecting";

  // A scheduled cancel whose date has passed stops billing even before the cancel job runs.
  if (subscription.cancelAt && subscription.cancelAt <= now) return "Subscription cancellation is due";
  if (addon.cancelAt && addon.cancelAt <= now) return "Add-on cancellation is due";
  return null;
}

/** The end of an add-on period that starts at `start`. Periods keep the billing
 * day of `anchor`, the add-on's start: one bought on Jan 31 renews on Feb 28,
 * then Mar 31. One-time add-ons have none. */
export function addonPeriodEnd(
  addon: { id: string; billingType: string; interval: Interval | null; intervalThreshold: number | null },
  anchor: Date,
  start = anchor,
): Date | null {
  if (addon.billingType !== "recurring") return null;

  if (!addon.interval || !addon.intervalThreshold) throw new Error(`Recurring add-on ${addon.id} has no billing interval`);

  return nextBillingBoundary(anchor, start, addon.interval, addon.intervalThreshold);
}
