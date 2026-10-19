/** A canceled or expired add-on or bundle purchase is finished. */
export function hasEnded(status: string) {
  return status === "canceled" || status === "expired";
}

export const COLLECTING_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

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
