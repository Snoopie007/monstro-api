import type { Interval, PaymentType } from "./DatabaseEnums";

export type StripeSubscriptionMigration = {
  sourceSubscriptionId: string;
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

export type SubscriptionBillingItem = {
  rootSubscriptionId: string;
  participantSubscriptionId: string;
  pricingId: string;
  quantity: number;
  pricing: SubscriptionBillingPrice | null;
  participant: {
    parentId: string | null;
    locationId: string | null;
    memberPlanPricingId: string | null;
  } | null;
};

export type SubscriptionBillingInput = {
  id: string;
  parentId: string | null;
  locationId: string | null;
  isParticipant: boolean;
  memberPlanPricingId: string | null;
  promoId?: string | null;
  metadata?: Record<string, unknown> | null;
  pricing?: SubscriptionBillingPrice | null;
  billingItems?: SubscriptionBillingItem[];
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
    participantSubscriptionId?: string;
  }[];
};
