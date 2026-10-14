import { bundlePreparationSchema } from "./bundlePreparation";
import { db } from "@/db/db";
import { calculateThresholdDate } from "@/utils/enrollUtils";
import { CheckoutError, getCheckoutContext, type CheckoutContext } from "@/utils/getCheckoutContext";
import { getCurrency } from "@/utils/getCurrency";
import {
  addons,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberInvoices,
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
  SubscriptionBundleSummary,
} from "@/subtrees/types";
import { commissionBillingSnapshot } from "@/subtrees/utils/invoiceItems";
import { generateUUID } from "@/subtrees/utils";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createBundleInvoice, type BundleCardPayment } from "./bundleInvoice";
import {
  hasConflictingAddonPriceOverrides,
  OPEN_ADDON_PURCHASE_STATUSES,
} from "./subscriptionAddonPricing";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PrepareBundlePurchaseInput = PurchaseBundleInput & {
  locationId: string;
  memberId: string;
};

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

export async function getBundlePurchaseSummary(
  locationId: string,
  bundlePurchaseId: string,
): Promise<SubscriptionBundleSummary | null> {
  const [purchase] = await db.select({
    id: bundlePurchases.id,
    bundleId: bundlePurchases.bundleId,
    bundleName: bundles.name,
    status: bundlePurchases.status,
    startsAt: bundlePurchases.startsAt,
    endedAt: bundlePurchases.endedAt,
  }).from(bundlePurchases)
    .innerJoin(bundles, eq(bundles.id, bundlePurchases.bundleId))
    .where(and(eq(bundlePurchases.id, bundlePurchaseId), eq(bundles.locationId, locationId)))
    .limit(1);
  if (!purchase) return null;

  const componentRows = await db.select({
    id: bundleComponents.id,
    memberPlanPricingId: bundleComponents.memberPlanPricingId,
    addonId: bundleComponents.addonId,
    priceOverride: bundleComponents.priceOverride,
    required: bundleComponents.required,
    sortOrder: bundleComponents.sortOrder,
  }).from(bundleComponents)
    .where(eq(bundleComponents.bundleId, purchase.bundleId))
    .orderBy(asc(bundleComponents.sortOrder));
  const pricingIds = componentRows.flatMap((component) => component.memberPlanPricingId ? [component.memberPlanPricingId] : []);
  const addonIds = componentRows.flatMap((component) => component.addonId ? [component.addonId] : []);
  const [pricingRows, addonRows, subscriptionRows, addonPurchaseRows] = await Promise.all([
    pricingIds.length === 0 ? [] : db.select({
      id: memberPlanPricing.id,
      pricingName: memberPlanPricing.name,
      planName: memberPlans.name,
    }).from(memberPlanPricing)
      .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
      .where(inArray(memberPlanPricing.id, pricingIds)),
    addonIds.length === 0 ? [] : db.select({ id: addons.id, name: addons.name })
      .from(addons).where(inArray(addons.id, addonIds)),
    db.select({ id: memberSubscriptions.id, componentId: memberSubscriptions.bundleComponentId })
      .from(memberSubscriptions).where(eq(memberSubscriptions.bundlePurchaseId, purchase.id)),
    db.select({ id: memberSubscriptionAddons.id, componentId: memberSubscriptionAddons.bundleComponentId })
      .from(memberSubscriptionAddons).where(eq(memberSubscriptionAddons.bundlePurchaseId, purchase.id)),
  ]);
  const pricingNames = new Map(pricingRows.map((pricing) => [pricing.id, `${pricing.planName} · ${pricing.pricingName}`]));
  const addonNames = new Map(addonRows.map((addon) => [addon.id, addon.name]));
  const subscriptionsByComponent = new Map(subscriptionRows.map((subscription) => [subscription.componentId, subscription.id]));
  const addonsByComponent = new Map(addonPurchaseRows.map((addon) => [addon.componentId, addon.id]));
  const purchasedComponentIds = new Set([
    ...subscriptionsByComponent.keys(),
    ...addonsByComponent.keys(),
  ]);

  const describe = (component: typeof componentRows[number]) => component.memberPlanPricingId
    ? { type: "subscription" as const, name: pricingNames.get(component.memberPlanPricingId) ?? "Subscription" }
    : { type: "addon" as const, name: addonNames.get(component.addonId ?? "") ?? "Add-on" };

  return {
    ...purchase,
    startsAt: purchase.startsAt.toISOString(),
    endedAt: purchase.endedAt?.toISOString() ?? null,
    components: componentRows.flatMap((component) => purchasedComponentIds.has(component.id)
      ? [{
        id: component.id,
        ...describe(component),
        priceOverride: component.priceOverride,
        required: component.required,
        memberSubscriptionId: subscriptionsByComponent.get(component.id) ?? null,
        memberSubscriptionAddonId: addonsByComponent.get(component.id) ?? null,
      }]
      : []),
  };
}

export async function getSubscriptionBundleSummary(locationId: string, subscriptionId: string) {
  const subscription = await db.query.memberSubscriptions.findFirst({
    where: and(eq(memberSubscriptions.id, subscriptionId), eq(memberSubscriptions.locationId, locationId)),
    columns: { bundlePurchaseId: true },
  });
  return subscription?.bundlePurchaseId
    ? getBundlePurchaseSummary(locationId, subscription.bundlePurchaseId)
    : null;
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

async function createPendingBundleRecords(tx: Transaction, input: PrepareBundlePurchaseInput, selection: BundleSelection) {
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

async function readPreparedPurchase(database: Pick<typeof db, "query">, input: PrepareBundlePurchaseInput) {
  const purchase = await database.query.bundlePurchases.findFirst({
    where: eq(bundlePurchases.id, input.purchaseId!),
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
  input = { ...input, purchaseId: input.purchaseId ?? generateUUID("bpur_") };
  let result: Awaited<ReturnType<typeof readPreparedPurchase>> | BundlePurchaseError = await readPreparedPurchase(db, input);
  if (!result) {
    const payment = await resolveCardPayment(input);
    if (payment.status !== "ready") return { ...payment, checkoutCreated: false };
    result = await db.transaction(async (tx) => {
      // There may be no purchase row yet; this lock covers its primary key.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.purchaseId!}))`);
      const existing = await readPreparedPurchase(tx, input);
      if (existing) return existing;
      const selection = await validateBundleSelection(tx, input);
      if (selection.status !== "valid") return { ...selection, checkoutCreated: false as const };
      const records = await createPendingBundleRecords(tx, input, selection);
      if (payment.card) await createBundleInvoice(tx, {
        locationId: input.locationId, memberId: input.memberId, purchaseId: records.purchaseId,
        description: selection.bundleName, payment: payment.card,
      });
      return { status: "created" as const, ...records };
    });
  }
  if (result.status !== "created") return result;
  const purchase = await getBundlePurchaseSummary(input.locationId, result.purchaseId);
  if (!purchase) throw new Error("Bundle purchase was not found after preparation");
  return { status: "created", value: { purchase, subscriptionIds: result.subscriptionIds, addonPurchaseIds: result.addonPurchaseIds } };
}

export async function activateBundlePurchase(locationId: string, bundlePurchaseId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${bundlePurchases.id}
      from ${bundlePurchases}
      inner join ${bundles} on ${bundles.id} = ${bundlePurchases.bundleId}
      where ${bundlePurchases.id} = ${bundlePurchaseId}
        and ${bundles.locationId} = ${locationId}
      for update
    `);
    const purchase = await tx.query.bundlePurchases.findFirst({
      where: eq(bundlePurchases.id, bundlePurchaseId),
      with: {
        bundle: {
          columns: { locationId: true },
          with: { components: { columns: { id: true, addonId: true, required: true } } },
        },
        subscriptions: { columns: { id: true, memberPlanPricingId: true, status: true, paymentType: true, gatewayPaymentId: true } },
        addonPurchases: { columns: { id: true, status: true, bundleComponentId: true } },
      },
    });

    if (!purchase || purchase.bundle?.locationId !== locationId) return { status: "not-found" as const };

    if (purchase.status === "canceled" || purchase.status === "expired") {
      return { status: "inactive" as const };
    }

    const subscriptionPaid = (subscription: typeof purchase.subscriptions[number]) =>
      ["active", "trialing"].includes(subscription.status)
      && (subscription.paymentType === "cash" || !!subscription.gatewayPaymentId);

    if (!purchase.subscriptions.every(subscriptionPaid)) return { status: "subscriptions-not-ready" as const };

    const subscriptionIds = purchase.subscriptions.map((subscription) => subscription.id);
    const openAddonPurchases = subscriptionIds.length === 0 ? [] : await tx.select({
      memberSubscriptionId: memberSubscriptionAddons.memberSubscriptionId,
      addonId: memberSubscriptionAddons.addonId,
    }).from(memberSubscriptionAddons).where(and(
      inArray(memberSubscriptionAddons.memberSubscriptionId, subscriptionIds),
      inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
    ));
    const addonIdsBySubscription = new Map<string, string[]>();

    for (const addon of openAddonPurchases) {
      addonIdsBySubscription.set(addon.memberSubscriptionId, [
        ...addonIdsBySubscription.get(addon.memberSubscriptionId) ?? [],
        addon.addonId,
      ]);
    }

    const pricedSubscriptions: Array<{ id: string; pricingId: string }> = [];

    for (const subscription of purchase.subscriptions) {
      if (!subscription.memberPlanPricingId) return { status: "subscriptions-not-ready" as const };

      pricedSubscriptions.push({ id: subscription.id, pricingId: subscription.memberPlanPricingId });
    }

    const pricingConflicts = await Promise.all(pricedSubscriptions.map((subscription) =>
      hasConflictingAddonPriceOverrides(
        tx,
        subscription.pricingId,
        addonIdsBySubscription.get(subscription.id) ?? [],
        new Date(),
      )
    ));

    if (pricingConflicts.some(Boolean)) return { status: "pricing-conflict" as const };

    const requiredAddonComponentIds = new Set(purchase.bundle?.components.flatMap((component) =>
      component.addonId && component.required ? [component.id] : []
    ) ?? []);
    const requiredAddonsReady = requiredAddonComponentIds.size === 0 || [...requiredAddonComponentIds].every((componentId) =>
      purchase.addonPurchases.some((addon) => addon.bundleComponentId === componentId && addon.status === "active")
    );

    if (requiredAddonsReady) {
      await tx.update(bundlePurchases).set({ status: "active", updated: new Date() })
        .where(eq(bundlePurchases.id, bundlePurchaseId));
    }

    return {
      status: "ready" as const,
      addonPurchaseIds: purchase.addonPurchases.flatMap((addon) => addon.status === "pending" ? [addon.id] : []),
    };
  });
}

export async function cancelBundlePurchase(locationId: string, bundlePurchaseId: string, reason?: string, expectedBundleId?: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${bundlePurchases.id}
      from ${bundlePurchases}
      inner join ${bundles} on ${bundles.id} = ${bundlePurchases.bundleId}
      where ${bundlePurchases.id} = ${bundlePurchaseId}
        and ${bundles.locationId} = ${locationId}
      for update
    `);
    const purchase = await tx.query.bundlePurchases.findFirst({
      where: eq(bundlePurchases.id, bundlePurchaseId),
      with: { bundle: { columns: { locationId: true } } },
    });
    if (!purchase || purchase.bundle?.locationId !== locationId || (expectedBundleId && purchase.bundleId !== expectedBundleId)) return { status: "not-found" as const };
    if (purchase.status === "canceled" || purchase.status === "expired") {
      return { status: "unchanged" as const, addonPurchaseIds: [] };
    }

    const now = new Date();
    const addonRows = await tx.select({ id: memberSubscriptionAddons.id })
      .from(memberSubscriptionAddons)
      .where(eq(memberSubscriptionAddons.bundlePurchaseId, bundlePurchaseId));
    const addonPurchaseIds = addonRows.map((addon) => addon.id);
    await tx.update(bundlePurchases).set({
      status: "canceled",
      endedAt: now,
      cancelReason: reason?.trim() || null,
      updated: now,
    }).where(eq(bundlePurchases.id, bundlePurchaseId));
    if (addonPurchaseIds.length > 0) {
      await tx.update(memberSubscriptionAddons).set({
        status: "canceled",
        cancelAt: now,
        canceledAt: now,
        endedAt: now,
        nextBillAt: null,
        updated: now,
      }).where(and(
        inArray(memberSubscriptionAddons.id, addonPurchaseIds),
        inArray(memberSubscriptionAddons.status, ["pending", "active", "past_due"]),
      ));
      await tx.update(memberInvoices).set({ status: "void", updated: now }).where(and(
        inArray(memberInvoices.memberSubscriptionAddonId, addonPurchaseIds),
        inArray(memberInvoices.status, ["draft", "sent", "unpaid"]),
      ));
    }
    return { status: "canceled" as const, addonPurchaseIds };
  });
}
