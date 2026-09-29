import type {
  Interval,
  StripeSubscriptionMigration,
  SubscriptionBillingInput,
  SubscriptionBillingPrice,
  SubscriptionBillingQuote,
} from "../types";

const migrationStates = new Set<StripeSubscriptionMigration["state"]>([
  "prepared", "legacy_stop_scheduled", "armed", "first_payment_verified", "blocked",
]);

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const normalized = value.replace(/(?:\.(\d{1,3}))?Z$/, (_, fraction: string | undefined) => `.${(fraction ?? "").padEnd(3, "0")}Z`);
  return date.toISOString() === normalized;
}

export function getStripeMigration(metadata: Record<string, unknown> | null | undefined): StripeSubscriptionMigration | null {
  if (!metadata || !("stripeMigration" in metadata)) return null;
  const raw = metadata.stripeMigration;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid Stripe migration metadata");
  const value = raw as Record<string, unknown>;
  if (
    typeof value.sourceSubscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(value.sourceSubscriptionId)
    || typeof value.connectedAccountId !== "string" || !/^acct_[A-Za-z0-9]+$/.test(value.connectedAccountId)
    || typeof value.state !== "string" || !migrationStates.has(value.state as StripeSubscriptionMigration["state"])
    || (value.blockedReason !== undefined && typeof value.blockedReason !== "string")
    || !isUtcTimestamp(value.cutoffAt) || !isUtcTimestamp(value.billingAnchor)
    || new Date(value.billingAnchor).getTime() > new Date(value.cutoffAt).getTime()
  ) throw new Error("Invalid Stripe migration metadata");
  return value as StripeSubscriptionMigration;
}

function validatePrice(price: SubscriptionBillingPrice | null | undefined, locationId: string): asserts price is SubscriptionBillingPrice & { interval: Interval; intervalThreshold: number } {
  if (!price || !Number.isSafeInteger(price.price) || price.price < 0 || price.price > 2_147_483_647) {
    throw new Error("Subscription billing price must be nonnegative integer cents");
  }
  if (!price.interval || !["day", "week", "month", "year"].includes(price.interval)
    || !Number.isSafeInteger(price.intervalThreshold) || price.intervalThreshold! < 1) {
    throw new Error("Subscription billing cadence is invalid");
  }
  if (price.plan?.locationId !== locationId) throw new Error("Subscription price does not belong to this location");
}

export function getSubscriptionBillingQuote(sub: SubscriptionBillingInput): SubscriptionBillingQuote {
  if (sub.parentId !== null) throw new Error("Access-only subscriptions cannot collect payments");
  if (!sub.locationId) throw new Error("Subscription billing location is missing");
  const migration = getStripeMigration(sub.metadata);
  const billingItems = sub.billingItems ?? [];
  if ((migration || billingItems.length > 0) && sub.promoId) {
    throw new Error("Imported and combined bills use final prices without an additional promotion");
  }
  if (billingItems.length === 0) {
    if (!sub.memberPlanPricingId || sub.pricing?.id !== sub.memberPlanPricingId) throw new Error("Subscription billing price is missing");
    validatePrice(sub.pricing, sub.locationId);
    return {
      name: sub.pricing.name,
      price: sub.pricing.price,
      interval: sub.pricing.interval,
      intervalThreshold: sub.pricing.intervalThreshold,
      items: [{ name: sub.pricing.name, price: sub.pricing.price, quantity: 1, pricingId: sub.pricing.id }],
    };
  }
  if (sub.memberPlanPricingId !== null || sub.isParticipant) throw new Error("A combined bill requires an access-free collecting root without its own price");
  const participants = new Set<string>();
  let total = 0;
  let cadence: { interval: Interval; intervalThreshold: number } | undefined;
  const items: SubscriptionBillingQuote["items"] = [];
  for (const item of billingItems) {
    if (item.rootSubscriptionId !== sub.id || item.participantSubscriptionId === sub.id || participants.has(item.participantSubscriptionId)
      || item.participant?.parentId !== sub.id || item.participant.locationId !== sub.locationId
      || item.participant.memberPlanPricingId !== item.pricingId || item.pricing?.id !== item.pricingId) {
      throw new Error("Combined bill item does not match its participant, price and root");
    }
    validatePrice(item.pricing, sub.locationId);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Billing quantity must be a positive integer");
    if (cadence && (cadence.interval !== item.pricing.interval || cadence.intervalThreshold !== item.pricing.intervalThreshold)) {
      throw new Error("Combined bill items must share a billing cadence");
    }
    cadence = { interval: item.pricing.interval, intervalThreshold: item.pricing.intervalThreshold };
    total += item.pricing.price * item.quantity;
    if (!Number.isSafeInteger(total) || total > 2_147_483_647) throw new Error("Combined bill total exceeds integer cents storage");
    participants.add(item.participantSubscriptionId);
    items.push({ name: item.pricing.name, price: item.pricing.price, quantity: item.quantity, pricingId: item.pricingId, participantSubscriptionId: item.participantSubscriptionId });
  }
  return { name: "Combined membership", price: total, ...cadence!, items };
}

/** Stripe calendar anchors are UTC; retain the original day through short months. */
export function nextBillingBoundary(anchor: Date, periodStart: Date, interval: Interval, intervalThreshold: number): Date {
  if (!Number.isFinite(anchor.getTime()) || !Number.isFinite(periodStart.getTime())
    || !Number.isSafeInteger(intervalThreshold) || intervalThreshold < 1) throw new Error("Invalid billing anchor or cadence");
  if (interval === "day" || interval === "week") {
    const duration = 86_400_000 * intervalThreshold * (interval === "week" ? 7 : 1);
    const period = Math.max(0, Math.floor((periodStart.getTime() - anchor.getTime()) / duration) + 1);
    const next = new Date(anchor.getTime() + period * duration);
    if (!Number.isFinite(next.getTime()) || next <= periodStart) throw new Error("Billing boundary is out of range");
    return next;
  }
  if (interval !== "month" && interval !== "year") throw new Error("Invalid billing interval");
  const months = intervalThreshold * (interval === "year" ? 12 : 1);
  const elapsedMonths = (periodStart.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + periodStart.getUTCMonth() - anchor.getUTCMonth();
  let period = Math.max(0, Math.floor(elapsedMonths / months));
  const atPeriod = (index: number) => {
    const month = anchor.getUTCMonth() + index * months;
    const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), month + 1, 0)).getUTCDate();
    const date = new Date(anchor);
    date.setUTCFullYear(anchor.getUTCFullYear(), month, Math.min(anchor.getUTCDate(), lastDay));
    return date;
  };
  let next = atPeriod(period);
  if (next <= periodStart) next = atPeriod(++period);
  if (!Number.isFinite(next.getTime()) || next <= periodStart) throw new Error("Billing boundary is out of range");
  return next;
}
