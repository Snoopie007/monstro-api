import type { Interval, PaymentType } from "./DatabaseEnums";
import type { Currency } from "./currency";
import type { MemberInvoice } from "./invoices";

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

export type CashBillingCycle = {
  periodStart: string;
  periodEnd: string;
};

export type CashBilling = CashBillingCycle & {
  dueAt: string;
  timezone: string;
  state: "scheduled" | "due" | "overdue" | "paid" | "blocked";
  action: "create" | "send" | "collect" | "view" | null;
  invoice: {
    id: string;
    status: MemberInvoice["status"];
    paid: boolean;
    total: number;
    currency: string;
  } | null;
};

export type UpcomingPayment = {
  id: string;
  subscriptionId: string;
  member: { id: string; name: string };
  membershipName: string;
  dueAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountMinor: number | null;
  currency: Currency;
  collection: "automatic" | "manual";
  source: "invoice" | "estimate";
  state: "scheduled" | "processing" | "blocked";
  reason: string | null;
  invoice: Pick<MemberInvoice, "id" | "status"> | null;
  canMarkPaid: boolean;
};

type UpcomingPaymentPage = {
  rows: UpcomingPayment[];
  page: number;
  pageSize: number;
  total: number;
};

export type UpcomingPaymentsResponse = {
  window: {
    from: string;
    untilExclusive: string;
    timezone: string;
    refreshAt: string;
  };
  totals: Array<{ currency: Currency; amountMinor: number }>;
  preview: UpcomingPayment[];
  manual: UpcomingPaymentPage;
  automatic: UpcomingPaymentPage;
};
