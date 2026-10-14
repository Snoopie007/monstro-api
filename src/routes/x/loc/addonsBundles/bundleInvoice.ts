import { bundlePreparationSchema } from "./bundlePreparation";
import type { db } from "@/db/db";
import {
  bundlePurchases,
  locations,
  memberInvoices,
  memberPlanPricing,
  memberSubscriptionAddons,
  memberSubscriptions,
  transactions,
} from "@/subtrees/schemas";
import type { Interval } from "@/subtrees/types";
import {
  assertCompleteBundleInvoice,
  commissionAllowanceSchema,
  isAlignedCommissionBasis,
  type CommissionBasis,
} from "@/subtrees/utils/invoiceItems";
import { nextBillingBoundary } from "@/subtrees/utils/subscriptionBilling";
import { calculateChargeDetails } from "@/utils/enrollUtils";
import type { CheckoutContext } from "@/utils/getCheckoutContext";
import { getCurrency } from "@/utils/getCurrency";
import { eq, sql } from "drizzle-orm";
import { quoteInitialSubscriptionCharge } from "../subscriptions/activation";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type BundleCardPayment = {
  gateway: CheckoutContext["gateway"];
  gatewayCustomerId: string;
  paymentMethodId: string;
  paymentType: "card" | "us_bank_account";
};

type BundleLocation = {
  id: string;
  country: string;
  taxRates: Array<{ percentage: number; isDefault: boolean }>;
  locationState: { planId: number } | null;
};

type LineBilling = {
  subTotal: number;
  tax: number;
  total: number;
  forPeriodStart: string;
  forPeriodEnd: string | null;
  commissionBasis?: CommissionBasis;
};

/** Matches how commissions read single-subscription invoices: an aligned visit
 * allowance shares the period's price; otherwise the price's fixed session
 * value applies, when it has one. */
function commissionBasisOf(
  snapshot: unknown,
  sessionCommissionValueMinor: number | null,
): CommissionBasis {
  const allowance = commissionAllowanceSchema.safeParse(snapshot);

  if (allowance.success && isAlignedCommissionBasis(allowance.data)) {
    return { type: "allowance", ...allowance.data };
  }

  if (sessionCommissionValueMinor !== null) {
    return { type: "fixed", sessionValueMinor: sessionCommissionValueMinor };
  }

  return { type: "unavailable" };
}

// The API's copy of the pricing schema predates this column, so it is read by name.
async function sessionCommissionValue(tx: Transaction, pricingId: string) {
  const [row] = await tx.select({
    value: sql<number | null>`${memberPlanPricing}.session_commission_value_minor`,
  }).from(memberPlanPricing).where(eq(memberPlanPricing.id, pricingId));

  return row?.value ?? null;
}

async function quoteBundledSubscription(
  tx: Transaction,
  location: BundleLocation,
  subscription: Awaited<ReturnType<typeof loadBundledSubscriptions>>[number],
) {
  const { pricing } = subscription;

  if (!pricing) throw new Error(`Bundled subscription ${subscription.id} has no pricing`);

  const quote = await quoteInitialSubscriptionCharge(tx, {
    subscription: { id: subscription.id, pricing, location },
    locationId: location.id,
  });
  const period = {
    forPeriodStart: subscription.currentPeriodStart.toISOString(),
    forPeriodEnd: subscription.currentPeriodEnd.toISOString(),
  };
  await tx.update(memberSubscriptions).set({ metadata: { ...subscription.metadata, billingAttempt: { ...bundlePreparationSchema.parse(subscription.metadata.billingAttempt ?? {}), initialDownpayment: quote.isDownpayment } } }).where(eq(memberSubscriptions.id, subscription.id));
  const feeLines = quote.feeLines.map((line) => {
    const subTotal = line.price * line.quantity - (line.discount ?? 0);
    const tax = line.tax ?? 0;

    return { ...line, billing: { subTotal, tax, total: subTotal + tax, ...period } };
  });
  const feeTax = feeLines.reduce((sum, line) => sum + line.billing.tax, 0);
  const serviceTax = quote.chargeDetails.tax - feeTax;
  const commissionBasis = commissionBasisOf(subscription.metadata.commissionBilling, await sessionCommissionValue(tx, pricing.id));
  const serviceLine = {
    ...quote.serviceLine,
    billing: {
      subTotal: quote.chargeDetails.subTotal,
      tax: serviceTax,
      total: quote.chargeDetails.subTotal + serviceTax,
      ...period,
      commissionBasis,
    },
  };

  return { items: [serviceLine, ...feeLines], platformFee: quote.chargeDetails.feesAmount };
}

function addonPeriodEnd(
  addon: { id: string; billingType: "one_time" | "recurring"; interval: Interval | null; intervalThreshold: number | null },
  startsAt: Date,
): Date | null {
  if (addon.billingType === "one_time") return null;

  if (!addon.interval || !addon.intervalThreshold) {
    throw new Error(`Recurring add-on ${addon.id} has no billing interval`);
  }

  return nextBillingBoundary(startsAt, startsAt, addon.interval, addon.intervalThreshold);
}

/** Prices an add-on the way its worker bills it: the bundle price when the
 * component sets one, the default tax rate, and no additional fees. */
function quoteBundledAddon(
  location: BundleLocation,
  purchaseId: string,
  addonPurchase: Awaited<ReturnType<typeof loadBundledAddons>>[number],
) {
  const { addon, bundleComponent } = addonPurchase;
  const bundlePrice = bundleComponent?.priceOverride ?? null;
  const price = bundleComponent && bundlePrice !== null
    ? {
      amount: bundlePrice,
      source: { type: "bundle" as const, bundlePurchaseId: purchaseId, bundleComponentId: bundleComponent.id },
    }
    : { amount: addon.amount, source: { type: "addon" as const, addonId: addon.id } };
  const chargeDetails = calculateChargeDetails({
    amount: price.amount,
    discount: 0,
    taxRate: location.taxRates.find((rate) => rate.isDefault)?.percentage ?? 0,
    planId: location.locationState?.planId ?? 0,
    additionalFees: [],
  });
  const periodEnd = addonPeriodEnd(addon, addonPurchase.startsAt);
  const item = {
    name: addon.name,
    quantity: 1,
    price: chargeDetails.unitCost,
    sourceType: "subscription_addon" as const,
    sourceId: addonPurchase.id,
    pricingSource: price.source,
    billing: {
      subTotal: chargeDetails.subTotal,
      tax: chargeDetails.tax,
      total: chargeDetails.total,
      forPeriodStart: addonPurchase.startsAt.toISOString(),
      forPeriodEnd: periodEnd?.toISOString() ?? null,
    },
  };

  return { item, platformFee: chargeDetails.feesAmount };
}

function loadBundledSubscriptions(tx: Transaction, purchaseId: string) {
  return tx.query.memberSubscriptions.findMany({
    where: eq(memberSubscriptions.bundlePurchaseId, purchaseId),
    columns: { id: true, currentPeriodStart: true, currentPeriodEnd: true, metadata: true },
    with: { pricing: { with: { plan: true } } },
  });
}

function loadBundledAddons(tx: Transaction, purchaseId: string) {
  return tx.query.memberSubscriptionAddons.findMany({
    where: eq(memberSubscriptionAddons.bundlePurchaseId, purchaseId),
    columns: { id: true, startsAt: true },
    with: {
      addon: true,
      bundleComponent: { columns: { id: true, priceOverride: true } },
    },
  });
}

// Fee lines count toward tax and total, not subtotal, as on single-subscription invoices.
function invoiceAmounts(items: Array<{ feeId?: string; billing: LineBilling }>) {
  let subTotal = 0;
  let tax = 0;
  let total = 0;

  for (const { feeId, billing } of items) {
    if (!feeId) subTotal += billing.subTotal;

    tax += billing.tax;
    total += billing.total;
  }

  return { subTotal, tax, total };
}

/** Writes a card purchase's one draft invoice and its pending transaction. Runs
 * inside prepare's transaction so the quotes see the components it inserted. */
export async function createBundleInvoice(tx: Transaction, input: {
  locationId: string;
  memberId: string;
  purchaseId: string;
  description: string;
  payment: BundleCardPayment;
}) {
  const { locationId, memberId, purchaseId, description, payment } = input;
  const location = await tx.query.locations.findFirst({
    where: eq(locations.id, locationId),
    columns: { id: true, country: true },
    with: { taxRates: true, locationState: true },
  });

  if (!location) throw new Error(`Location ${locationId} was not found`);

  const subscriptions = await loadBundledSubscriptions(tx, purchaseId);
  const addonPurchases = await loadBundledAddons(tx, purchaseId);
  const subscriptionQuotes = [];

  for (const subscription of subscriptions) {
    subscriptionQuotes.push(await quoteBundledSubscription(tx, location, subscription));
  }

  const addonQuotes = addonPurchases.map((addonPurchase) => quoteBundledAddon(location, purchaseId, addonPurchase));
  const items = [
    ...subscriptionQuotes.flatMap((quote) => quote.items),
    ...addonQuotes.map((quote) => quote.item),
  ];
  const amounts = invoiceAmounts(items);
  const platformFeeAmount = [...subscriptionQuotes, ...addonQuotes].reduce((sum, quote) => sum + quote.platformFee, 0);
  const currency = getCurrency(location.country);

  assertCompleteBundleInvoice(items, {
    subscriptionIds: subscriptions.map((subscription) => subscription.id),
    addonPurchaseIds: addonPurchases.map((addonPurchase) => addonPurchase.id),
  }, amounts);

  const [transaction] = await tx.insert(transactions).values({
    memberId,
    locationId,
    description: `${description} bundle`,
    type: "inbound",
    status: "pending",
    paymentType: payment.paymentType,
    paymentMethodId: payment.paymentMethodId,
    ...amounts,
    currency,
    feeAmount: platformFeeAmount,
    items,
    metadata: {
      checkoutKind: "bundle",
      gatewayService: payment.gateway.service,
      billingAttempt: {
        gatewayIntegrationId: payment.gateway.integrationId,
        gatewayCustomerId: payment.gatewayCustomerId,
        stripeAccountId: payment.gateway.service === "stripe" ? payment.gateway.accountId : undefined,
      },
    },
  }).returning({ id: transactions.id });

  if (!transaction) throw new Error("Bundle transaction was not created");

  const [invoice] = await tx.insert(memberInvoices).values({
    memberId,
    locationId,
    memberPlanId: null,
    transactionId: transaction.id,
    description,
    items,
    ...amounts,
    currency,
    status: "draft",
    dueDate: new Date(),
    paymentType: payment.paymentType,
    invoiceType: "one-off",
    metadata: {
      collectionMethod: "charge_automatically",
      gatewayService: payment.gateway.service,
      gatewayIntegrationId: payment.gateway.integrationId,
      gatewayCustomerId: payment.gatewayCustomerId,
      platformFeeAmount,
    },
  }).returning({ id: memberInvoices.id });

  if (!invoice) throw new Error("Bundle invoice was not created");

  await tx.update(bundlePurchases).set({ invoiceId: invoice.id, updated: new Date() })
    .where(eq(bundlePurchases.id, purchaseId));
}
