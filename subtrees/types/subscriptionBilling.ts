import type { Interval, PaymentType } from "./DatabaseEnums";
import type { Currency } from "./currency";
import type { MemberInvoice } from "./invoices";
import type { Member, MemberSubscription } from "./member";

// Billing inputs and calculated quotes.
export type SubscriptionBillingPrice = {
  id: string;
  name: string;
  price: number;
  interval: Interval | null;
  intervalThreshold: number | null;
  plan?: { locationId: string } | null;
};

export type SubscriptionBillingInput = {
  id: string;
  parentId: string | null;
  locationId: string | null;
  memberPlanPricingId: string | null;
  promoId?: string | null;
  metadata?: Record<string, unknown> | null;
  pricing?: SubscriptionBillingPrice | null;
};

export type SubscriptionBillingQuote = {
  name: string;
  price: number;
  interval: Interval;
  intervalThreshold: number;
  items: {
    name: string;
    price: number;
    quantity: number;
    pricingId: string;
  }[];
};

// Persisted gateway attempt and migration metadata.
export type StripeSubscriptionMigration = {
  sourceSubscriptionId: string;
  sourceSubscriptionItemId: string;
  connectedAccountId: string;
  state: "prepared" | "legacy_stop_scheduled" | "armed" | "first_payment_verified" | "blocked";
  cutoffAt: string;
  billingAnchor: string;
  blockedReason?: string;
};

export type SubscriptionBillingAttempt = {
  id: string;
  status: "in_flight" | "succeeded" | "failed" | "processing" | "unknown" | "requires_action";
  startedAt: string;
  paymentIntentId?: string;
  gatewayIntegrationId: string;
  gatewayCustomerId: string;
  paymentMethodId: string;
  paymentType: PaymentType;
  stripeAccountId?: string;
  retryable?: boolean;
};

/** Serialized cycle identity shared by the cash resolver and API response.
 * Invoice period columns are nullable Dates; a selected cash cycle requires both ISO timestamps. */
export type CashBillingCycle = {
  periodStart: string;
  periodEnd: string;
};

/** Derived collection state for staff actions. Invoice status alone cannot tell
 * whether a subscription is eligible, overdue, or still needs an invoice. */
export type CashBilling = CashBillingCycle & {
  renewal: CashBillingCycle | null;
  dueAt: string;
  timezone: string;
  state: "scheduled" | "due" | "overdue" | "paid" | "blocked";
  action: "create" | "send" | "collect" | "view" | null;
  invoice: (Pick<MemberInvoice, "id" | "status" | "paid" | "total"> & {
    // The resolver supplies a fallback for the nullable invoice currency.
    currency: NonNullable<MemberInvoice["currency"]>;
  }) | null;
};

/** API row for an existing invoice or a projected charge with no invoice yet.
 * Dates are serialized, and unavailable estimates have a null amount. Collection
 * state and permissions are calculated, so this cannot be a MemberInvoice alias. */
export type UpcomingPayment = {
  id: string;
  subscriptionId: MemberSubscription["id"];
  member: Pick<Member, "id"> & { name: string };
  membershipName: string;
  dueAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountMinor: MemberInvoice["total"] | null;
  currency: Currency;
  collection: "automatic" | "manual";
  source: "invoice" | "estimate";
  state: "scheduled" | "processing" | "blocked";
  reason: string | null;
  invoice: Pick<MemberInvoice, "id" | "status"> | null;
  canMarkPaid: boolean;
};

// Both collection groups use the same pagination shape.
type UpcomingPaymentPage = {
  rows: UpcomingPayment[];
  page: number;
  pageSize: number;
  total: number;
};

/** Shared API/frontend contract for the location's remaining-month view.
 * Totals include all matching scheduled payments, before preview or pagination. */
export type UpcomingPaymentsResponse = {
  window: {
    from: string;
    untilExclusive: string;
    timezone: string;
    refreshAt: string;
  };
  totals: Array<{ currency: Currency; amountMinor: MemberInvoice["total"] }>;
  preview: UpcomingPayment[];
  manual: UpcomingPaymentPage;
  automatic: UpcomingPaymentPage;
};
