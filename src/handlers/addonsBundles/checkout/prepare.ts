import { bundlePreparationSchema } from "./preparationFacts";
import { db } from "@/db/db";
import { calculateThresholdDate } from "@/utils/enrollUtils";
import { CheckoutError, getCheckoutContext, type CheckoutContext } from "@/utils/getCheckoutContext";
import { getCurrency } from "@/utils/getCurrency";
import {
  addons,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberLocations,
  memberPlanPricing,
  memberPlans,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@/subtrees/schemas";
import type {
  BundlePurchaseResponse,
  Interval,
  PurchaseBundleInput,
} from "@/subtrees/types";
import { commissionBillingSnapshot } from "@/subtrees/utils/invoiceItems";
import { generateUUID } from "@/subtrees/utils";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createBundleInvoice, type BundleCardPayment } from "./invoice";
import { getBundlePurchaseSummary } from "../bundleSummary";
import { hasConflictingAddonPriceOverrides } from "../addonPricing";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PrepareBundlePurchaseInput = PurchaseBundleInput & {
  locationId: string;
  memberId: string;
};

type BundlePurchaseDraft = PrepareBundlePurchaseInput & { purchaseId: string };

type BundlePurchaseError = {
  status: "member-not-found" | "bundle-not-found" | "invalid-components" | "pricing-conflict" | "payment-unavailable" | "intent-conflict";
  error: string;
  checkoutCreated?: false;
};

export type BundlePurchaseErrorStatus = BundlePurchaseError["status"];

type BundlePurchaseResult = { status: "created"; value: BundlePurchaseResponse } | BundlePurchaseError;

type BundlePricing = {
  id: string;
  interval: Interval;
  intervalThreshold: number;
  expireInterval: Interval | null;
  expireThreshold: number | null;
  classLimitInterval: string | null;
  totalClassLimit: number | null;
};

type AddonComponent = { componentId: string; addonId: string };

type BundleSelection = {
  status: "valid";
  bundleName: string;
  startsAt: Date;
  subscriptions: Array<{ componentId: string; pricing: BundlePricing; addons: AddonComponent[] }>;
};

const UNAVAILABLE_PRICE = "The bundle contains an unavailable subscription price";

function invalidSelection(error: string): BundlePurchaseError {
  return { status: "invalid-components", error };
}

/** Card bundles are charged through the location's gateway; cash bundles need none. */
async function resolveCardPayment(
  input: PrepareBundlePurchaseInput,
): Promise<{ status: "ready"; card: BundleCardPayment | null } | BundlePurchaseError> {
  if (input.paymentType === "cash") return { status: "ready", card: null };

  if (!input.paymentMethodId) {
    return { status: "payment-unavailable", error: "Choose a payment method for this bundle" };
  }

  let context: CheckoutContext;

  try {
    context = await getCheckoutContext({ lid: input.locationId, mid: input.memberId });
  } catch (error) {
    if (error instanceof CheckoutError) return { status: "payment-unavailable", error: error.message };

    throw error;
  }

  if (context.gateway.service !== "stripe" && input.paymentType !== "card") {
    return { status: "payment-unavailable", error: "This location's payment gateway only accepts saved cards" };
  }

  return {
    status: "ready",
    card: {
      gateway: context.gateway,
      gatewayCustomerId: context.gatewayCustomerId,
      paymentMethodId: input.paymentMethodId,
      paymentType: input.paymentType,
    },
  };
}

async function validateBundleSelection(
  tx: Transaction,
  input: PrepareBundlePurchaseInput,
): Promise<BundleSelection | BundlePurchaseError> {
  const { locationId, memberId } = input;
  await tx.execute(sql`
    select ${memberLocations.memberId}
    from ${memberLocations}
    where ${memberLocations.memberId} = ${memberId}
      and ${memberLocations.locationId} = ${locationId}
    for update
  `);
  const memberLocation = await tx.query.memberLocations.findFirst({
    where: and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, locationId)),
    columns: { memberId: true },
    with: { location: { columns: { country: true } } },
  });

  if (!memberLocation) return { status: "member-not-found", error: "Member not found in this location" };

  const bundle = await tx.query.bundles.findFirst({
    where: and(eq(bundles.id, input.bundleId), eq(bundles.locationId, locationId), eq(bundles.archived, false)),
    with: { components: { orderBy: [asc(bundleComponents.sortOrder)] } },
  });

  if (!bundle) return { status: "bundle-not-found", error: "Bundle not found" };

  const componentIds = new Set(bundle.components.map((component) => component.id));

  if (input.selectedOptionalComponentIds.some((id) => !componentIds.has(id))) {
    return invalidSelection("The bundle selection contains an unknown component");
  }

  const selectedOptionalIds = new Set(input.selectedOptionalComponentIds);
  const pricingIdByComponent = new Map<string, string>();
  const addonsByTarget = new Map<string, AddonComponent[]>();

  for (const component of bundle.components) {
    if (!component.required && !selectedOptionalIds.has(component.id)) continue;

    if (component.memberPlanPricingId) {
      pricingIdByComponent.set(component.id, component.memberPlanPricingId);
    } else if (component.addonId && component.targetSubscriptionComponentId) {
      const targetAddons = addonsByTarget.get(component.targetSubscriptionComponentId) ?? [];
      targetAddons.push({ componentId: component.id, addonId: component.addonId });
      addonsByTarget.set(component.targetSubscriptionComponentId, targetAddons);
    }
  }

  if (pricingIdByComponent.size === 0) return invalidSelection("A bundle purchase needs at least one subscription");

  if ([...addonsByTarget.keys()].some((targetId) => !pricingIdByComponent.has(targetId))) {
    return invalidSelection("Every selected add-on must be attached to a selected subscription");
  }

  const pricingRows = await tx.select({
    id: memberPlanPricing.id,
    interval: memberPlanPricing.interval,
    intervalThreshold: memberPlanPricing.intervalThreshold,
    expireInterval: memberPlanPricing.expireInterval,
    expireThreshold: memberPlanPricing.expireThreshold,
    classLimitInterval: memberPlans.classLimitInterval,
    totalClassLimit: memberPlans.totalClassLimit,
  }).from(memberPlanPricing)
    .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
    .where(and(inArray(memberPlanPricing.id, [...pricingIdByComponent.values()]), eq(memberPlans.locationId, locationId)));
  const pricingById = new Map<string, BundlePricing>();

  for (const row of pricingRows) {
    if (!row.interval || !row.intervalThreshold) return invalidSelection(UNAVAILABLE_PRICE);

    pricingById.set(row.id, { ...row, interval: row.interval, intervalThreshold: row.intervalThreshold });
  }

  const subscriptions: BundleSelection["subscriptions"] = [];

  for (const [componentId, pricingId] of pricingIdByComponent) {
    const pricing = pricingById.get(pricingId);

    if (!pricing) return invalidSelection(UNAVAILABLE_PRICE);

    subscriptions.push({ componentId, pricing, addons: addonsByTarget.get(componentId) ?? [] });
  }

  const now = new Date();
  const startsAt = input.startDate ? new Date(input.startDate) : now;

  if (Number.isNaN(startsAt.getTime())) return invalidSelection("Start date is invalid");

  if (startsAt.getTime() > now.getTime()) {
    return invalidSelection("Future bundle start dates are not supported yet");
  }

  const currency = getCurrency(memberLocation.location.country);
  const addonIds = subscriptions.flatMap((subscription) => subscription.addons.map((addon) => addon.addonId));
  const addonCurrencies = addonIds.length === 0
    ? []
    : await tx.select({ currency: addons.currency }).from(addons).where(inArray(addons.id, addonIds));

  if (addonCurrencies.some((addon) => addon.currency.toUpperCase() !== currency)) {
    return invalidSelection(`Every bundled add-on must be priced in ${currency}`);
  }

  const pricingConflicts = await Promise.all(subscriptions.map((subscription) => hasConflictingAddonPriceOverrides(
    tx,
    subscription.pricing.id,
    subscription.addons.map((addon) => addon.addonId),
    startsAt,
  )));

  if (pricingConflicts.some(Boolean)) {
    return { status: "pricing-conflict", error: "Selected add-ons would apply conflicting subscription prices" };
  }

  return { status: "valid", bundleName: bundle.name, startsAt, subscriptions };
}

function subscriptionCancelAt(pricing: BundlePricing, startsAt: Date) {
  if (!pricing.expireInterval || !pricing.expireThreshold) return null;

  return calculateThresholdDate({ startDate: startsAt, threshold: pricing.expireThreshold, interval: pricing.expireInterval });
}

async function createPendingBundleRecords(tx: Transaction, input: BundlePurchaseDraft, selection: BundleSelection) {
  const { locationId, memberId, paymentType } = input;
  const { startsAt } = selection;
  const [purchase] = await tx.insert(bundlePurchases).values({
    id: input.purchaseId,
    bundleId: input.bundleId,
    memberId,
    created: input.startDate ? new Date() : startsAt,
    status: "pending",
    startsAt,
  }).returning({ id: bundlePurchases.id });

  if (!purchase) throw new Error("Bundle purchase was not created");

  const subscriptionIds: string[] = [];
  const addonPurchaseIds: string[] = [];

  for (const { componentId, pricing, addons: bundledAddons } of selection.subscriptions) {
    const [subscription] = await tx.insert(memberSubscriptions).values({
      memberId,
      memberPlanPricingId: pricing.id,
      locationId,
      startDate: startsAt,
      currentPeriodStart: startsAt,
      currentPeriodEnd: calculateThresholdDate({
        startDate: startsAt,
        threshold: pricing.intervalThreshold,
        interval: pricing.interval,
      }),
      cancelAt: subscriptionCancelAt(pricing, startsAt),
      status: "incomplete",
      paymentType,
      bundlePurchaseId: purchase.id,
      bundleComponentId: componentId,
      classCredits: pricing.classLimitInterval === "term" ? pricing.totalClassLimit ?? 0 : 0,
      metadata: {
        bundlePurchaseId: purchase.id, commissionBilling: commissionBillingSnapshot(pricing, pricing),
        billingAttempt: { checkout: { selectedOptionalComponentIds: [...new Set(input.selectedOptionalComponentIds)].sort(), startDate: input.startDate ? new Date(input.startDate).toISOString() : null } },
      },
    }).returning({ id: memberSubscriptions.id });

    if (!subscription) throw new Error("Bundled subscription was not created");

    subscriptionIds.push(subscription.id);

    if (bundledAddons.length === 0) continue;

    const addonPurchases = await tx.insert(memberSubscriptionAddons).values(bundledAddons.map((addon) => ({
      memberSubscriptionId: subscription.id,
      addonId: addon.addonId,
      status: "pending" as const,
      startsAt,
      bundlePurchaseId: purchase.id,
      bundleComponentId: addon.componentId,
    }))).returning({ id: memberSubscriptionAddons.id });
    addonPurchaseIds.push(...addonPurchases.map((addonPurchase) => addonPurchase.id));
  }

  return { purchaseId: purchase.id, subscriptionIds, addonPurchaseIds };
}

async function readPreparedPurchase(database: Pick<typeof db, "query">, input: BundlePurchaseDraft) {
  const purchase = await database.query.bundlePurchases.findFirst({
    where: eq(bundlePurchases.id, input.purchaseId),
    with: {
      bundle: { columns: { locationId: true }, with: { components: { columns: { id: true, required: true } } } },
      subscriptions: { columns: { id: true, bundleComponentId: true, paymentType: true, metadata: true } },
      addonPurchases: { columns: { id: true, bundleComponentId: true } },
    },
  });
  if (!purchase) return null;
  if (input.startDate && !Number.isFinite(new Date(input.startDate).getTime())) return invalidSelection("Start date is invalid");
  const checkout = bundlePreparationSchema.parse(purchase.subscriptions[0]?.metadata.billingAttempt ?? {}).checkout;
  const requested = [...new Set(input.selectedOptionalComponentIds)].sort();
  const selected = checkout?.selectedOptionalComponentIds;
  const startMatches = checkout && (input.startDate ? new Date(input.startDate).toISOString() : null) === checkout.startDate;
  if (purchase.bundleId !== input.bundleId || purchase.memberId !== input.memberId || purchase.bundle.locationId !== input.locationId
    || JSON.stringify(selected) !== JSON.stringify(requested) || !startMatches
    || purchase.subscriptions.some(sub => (sub.paymentType === "cash") !== (input.paymentType === "cash"))) {
    return { status: "intent-conflict" as const, error: "This checkout belongs to a different bundle selection. Resolve it before starting another checkout." };
  }
  return {
    status: "created" as const, purchaseId: purchase.id,
    subscriptionIds: purchase.subscriptions.map(sub => sub.id), addonPurchaseIds: purchase.addonPurchases.map(addon => addon.id),
  };
}

/** Create or resume the caller's durable draft before reading mutable catalog
 * or gateway settings. The purchase primary key serializes concurrent prepare. */
export async function prepareBundlePurchase(input: PrepareBundlePurchaseInput): Promise<BundlePurchaseResult> {
  const draft: BundlePurchaseDraft = { ...input, purchaseId: input.purchaseId ?? generateUUID("bpur_") };
  let result: Awaited<ReturnType<typeof readPreparedPurchase>> | BundlePurchaseError = await readPreparedPurchase(db, draft);

  if (!result) {
    const payment = await resolveCardPayment(draft);

    if (payment.status !== "ready") return { ...payment, checkoutCreated: false };

    result = await db.transaction(async (tx) => {
      // There may be no purchase row yet; this lock covers its primary key.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${draft.purchaseId}))`);
      const existing = await readPreparedPurchase(tx, draft);

      if (existing) return existing;

      const selection = await validateBundleSelection(tx, draft);

      if (selection.status !== "valid") return { ...selection, checkoutCreated: false as const };

      const records = await createPendingBundleRecords(tx, draft, selection);

      if (payment.card) await createBundleInvoice(tx, {
        locationId: draft.locationId, memberId: draft.memberId, purchaseId: records.purchaseId,
        description: selection.bundleName, payment: payment.card,
      });

      return { status: "created" as const, ...records };
    });
  }

  if (result.status !== "created") return result;

  const purchase = await getBundlePurchaseSummary(draft.locationId, result.purchaseId);

  if (!purchase) throw new Error("Bundle purchase was not found after preparation");

  return { status: "created", value: { purchase, subscriptionIds: result.subscriptionIds, addonPurchaseIds: result.addonPurchaseIds } };
}
