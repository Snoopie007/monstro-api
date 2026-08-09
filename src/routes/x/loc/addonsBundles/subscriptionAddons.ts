import { db } from "@/db/db";
import {
  addons,
  memberInvoices,
  memberPlanPricing,
  memberPlans,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@subtrees/schemas";
import type {
  AvailableSubscriptionAddon,
  SubscriptionAddonOverview,
  SubscriptionAddonPriceEffect,
  SubscriptionAddonPricing,
  SubscriptionAddonPurchaseItem,
} from "@subtrees/types";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getSubscriptionBundleSummary } from "./bundlePurchases";
import {
  hasConflictingAddonPriceOverrides,
  loadActiveAddonPriceOverrides,
  OPEN_ADDON_PURCHASE_STATUSES,
} from "./subscriptionAddonPricing";

type SubscriptionContext = {
  id: string;
  memberId: string;
  status: string;
  memberPlanPricingId: string;
  basePricing: SubscriptionAddonPricing;
};

type PurchaseRow = Awaited<ReturnType<typeof loadPurchaseRows>>[number];

function serializeDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

function isEffectivePurchase(purchase: PurchaseRow, periodStart: Date, periodEnd: Date) {
  if (purchase.status !== "active") return false;
  if (purchase.startsAt > periodStart) return false;
  if (!purchase.paidPeriodStartsAt || purchase.paidPeriodStartsAt > periodStart) return false;
  if (purchase.paidPeriodEndsAt && purchase.paidPeriodEndsAt < periodEnd) return false;
  return true;
}

async function loadSubscriptionContext(locationId: string, subscriptionId: string): Promise<SubscriptionContext | null> {
  const [row] = await db.select({
    id: memberSubscriptions.id,
    memberId: memberSubscriptions.memberId,
    status: memberSubscriptions.status,
    memberPlanPricingId: memberSubscriptions.memberPlanPricingId,
    pricingId: memberPlanPricing.id,
    pricingName: memberPlanPricing.name,
    pricingPrice: memberPlanPricing.price,
    pricingInterval: memberPlanPricing.interval,
    pricingIntervalThreshold: memberPlanPricing.intervalThreshold,
    planId: memberPlans.id,
    planName: memberPlans.name,
  }).from(memberSubscriptions)
    .innerJoin(memberPlanPricing, eq(memberPlanPricing.id, memberSubscriptions.memberPlanPricingId))
    .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
    .where(and(
      eq(memberSubscriptions.id, subscriptionId),
      eq(memberSubscriptions.locationId, locationId),
    ))
    .limit(1);

  if (!row || !row.memberPlanPricingId) return null;

  return {
    id: row.id,
    memberId: row.memberId,
    status: row.status,
    memberPlanPricingId: row.memberPlanPricingId,
    basePricing: {
      id: row.pricingId,
      memberPlanId: row.planId,
      name: row.pricingName,
      planName: row.planName,
      price: row.pricingPrice,
      interval: row.pricingInterval,
      intervalThreshold: row.pricingIntervalThreshold,
    },
  };
}

async function loadPurchaseRows(subscriptionId: string) {
  return db.query.memberSubscriptionAddons.findMany({
    where: eq(memberSubscriptionAddons.memberSubscriptionId, subscriptionId),
    with: { addon: true },
    orderBy: [asc(memberSubscriptionAddons.created)],
  });
}

async function loadPriceEffects(
  basePricing: SubscriptionAddonPricing,
  addonIds: string[],
  at: Date,
) {
  if (addonIds.length === 0) return new Map<string, SubscriptionAddonPriceEffect>();

  const mappings = await loadActiveAddonPriceOverrides(basePricing.id, addonIds, at);
  if (mappings.length === 0) return new Map<string, SubscriptionAddonPriceEffect>();

  const replacementIds = Array.from(new Set(mappings.map((mapping) => mapping.replacementPlanPricingId)));
  const replacements = await db.select({
    id: memberPlanPricing.id,
    memberPlanId: memberPlanPricing.memberPlanId,
    name: memberPlanPricing.name,
    price: memberPlanPricing.price,
    interval: memberPlanPricing.interval,
    intervalThreshold: memberPlanPricing.intervalThreshold,
    planName: memberPlans.name,
  }).from(memberPlanPricing)
    .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
    .where(inArray(memberPlanPricing.id, replacementIds));
  const pricingById = new Map(replacements.map((pricing) => [pricing.id, pricing]));

  return new Map(mappings.flatMap((mapping) => {
    const replacementPricing = pricingById.get(mapping.replacementPlanPricingId);
    return replacementPricing
      ? [[mapping.addonId, { sourcePricing: basePricing, replacementPricing }] as const]
      : [];
  }));
}

function serializePurchase(
  purchase: PurchaseRow,
  priceEffect: SubscriptionAddonPriceEffect | null,
  effective: boolean,
): SubscriptionAddonPurchaseItem {
  return {
    ...purchase,
    startsAt: purchase.startsAt.toISOString(),
    paidPeriodStartsAt: serializeDate(purchase.paidPeriodStartsAt),
    paidPeriodEndsAt: serializeDate(purchase.paidPeriodEndsAt),
    nextBillAt: serializeDate(purchase.nextBillAt),
    cancelAt: serializeDate(purchase.cancelAt),
    canceledAt: serializeDate(purchase.canceledAt),
    endedAt: serializeDate(purchase.endedAt),
    created: purchase.created.toISOString(),
    updated: serializeDate(purchase.updated),
    addon: {
      id: purchase.addon.id,
      name: purchase.addon.name,
      description: purchase.addon.description,
      amount: purchase.addon.amount,
      currency: purchase.addon.currency,
      billingType: purchase.addon.billingType,
      interval: purchase.addon.interval,
      intervalThreshold: purchase.addon.intervalThreshold,
      classAccessOverride: purchase.addon.classAccessOverride,
    },
    priceEffect,
    effective,
  };
}

export async function getSubscriptionAddonOverview(
  locationId: string,
  subscriptionId: string,
  periodStart = new Date(),
  periodEnd = periodStart,
): Promise<SubscriptionAddonOverview | null> {
  const subscription = await loadSubscriptionContext(locationId, subscriptionId);
  if (!subscription) return null;

  const [purchaseRows, addonRows, bundlePurchase] = await Promise.all([
    loadPurchaseRows(subscriptionId),
    db.select().from(addons).where(and(eq(addons.locationId, locationId), eq(addons.archived, false))).orderBy(asc(addons.name)),
    getSubscriptionBundleSummary(locationId, subscriptionId),
  ]);
  const allAddonIds = Array.from(new Set([
    ...purchaseRows.map((purchase) => purchase.addonId),
    ...addonRows.map((addon) => addon.id),
  ]));
  const priceEffects = await loadPriceEffects(subscription.basePricing, allAddonIds, periodStart);
  const purchases = purchaseRows.map((purchase) => {
    const effective = isEffectivePurchase(purchase, periodStart, periodEnd);
    return serializePurchase(purchase, priceEffects.get(purchase.addonId) ?? null, effective);
  });
  const effectivePricePurchases = purchases.filter((purchase) => purchase.effective && purchase.priceEffect);
  const effectivePricingIds = new Set(effectivePricePurchases.map((purchase) => purchase.priceEffect!.replacementPricing.id));
  if (effectivePricingIds.size > 1) {
    throw new Error(`Subscription ${subscriptionId} has conflicting active add-on prices`);
  }
  const pricingPurchase = effectivePricePurchases[0];
  const bundlePricingComponent = bundlePurchase?.status === "active"
    ? bundlePurchase.components.find((component) =>
      component.memberSubscriptionId === subscriptionId && component.priceOverride !== null
    )
    : null;
  const openAddonIds = new Set(purchases
    .filter((purchase) => OPEN_ADDON_PURCHASE_STATUSES.includes(purchase.status as typeof OPEN_ADDON_PURCHASE_STATUSES[number]))
    .map((purchase) => purchase.addonId));
  const currentReplacementId = pricingPurchase?.priceEffect?.replacementPricing.id;

  const availableAddons: AvailableSubscriptionAddon[] = addonRows.map((addon) => {
    const priceEffect = priceEffects.get(addon.id) ?? null;
    let unavailableReason: string | null = null;
    if (!['active', 'trialing'].includes(subscription.status)) {
      unavailableReason = "Add-ons can only be added to an active subscription";
    } else if (openAddonIds.has(addon.id)) {
      unavailableReason = "Already added to this subscription";
    } else if (
      currentReplacementId
      && priceEffect
      && priceEffect.replacementPricing.id !== currentReplacementId
    ) {
      unavailableReason = "This subscription already has a different add-on price";
    }

    return {
      id: addon.id,
      name: addon.name,
      description: addon.description,
      amount: addon.amount,
      currency: addon.currency,
      billingType: addon.billingType,
      interval: addon.interval,
      intervalThreshold: addon.intervalThreshold,
      classAccessOverride: addon.classAccessOverride,
      priceEffect,
      unavailableReason,
    };
  });

  return {
    basePricing: subscription.basePricing,
    effectivePricing: bundlePricingComponent
      ? { ...subscription.basePricing, price: bundlePricingComponent.priceOverride! }
      : pricingPurchase?.priceEffect?.replacementPricing ?? subscription.basePricing,
    pricingSource: bundlePricingComponent
      ? {
        type: "bundle",
        bundlePurchaseId: bundlePurchase!.id,
        bundleComponentId: bundlePricingComponent.id,
      }
      : pricingPurchase
        ? { type: "addon", memberSubscriptionAddonId: pricingPurchase.id }
        : { type: "base" },
    unlimitedClassAccess: purchases.some((purchase) => purchase.effective && purchase.addon.classAccessOverride === "unlimited"),
    purchases,
    availableAddons,
    bundlePurchase,
  };
}

export async function purchaseSubscriptionAddon(locationId: string, subscriptionId: string, addonId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${memberSubscriptions.id}
      from ${memberSubscriptions}
      where ${memberSubscriptions.id} = ${subscriptionId}
        and ${memberSubscriptions.locationId} = ${locationId}
      for update
    `);
    const subscription = await loadSubscriptionContext(locationId, subscriptionId);
    if (!subscription) return { status: "subscription-not-found" as const };
    if (!['active', 'trialing'].includes(subscription.status)) {
      return { status: "subscription-inactive" as const };
    }

    const addon = await tx.query.addons.findFirst({
      where: and(eq(addons.id, addonId), eq(addons.locationId, locationId), eq(addons.archived, false)),
      columns: { id: true },
    });
    if (!addon) return { status: "addon-not-found" as const };

    const openPurchases = await tx.query.memberSubscriptionAddons.findMany({
      where: and(
        eq(memberSubscriptionAddons.memberSubscriptionId, subscriptionId),
        inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
      ),
      columns: { id: true, addonId: true, status: true },
    });
    const duplicate = openPurchases.find((purchase) => purchase.addonId === addonId);
    if (duplicate) return { status: "already-purchased" as const, purchaseId: duplicate.id };

    const hasPricingConflict = await hasConflictingAddonPriceOverrides(
      subscription.basePricing.id,
      [...openPurchases.map((purchase) => purchase.addonId), addonId],
      new Date(),
    );
    if (hasPricingConflict) {
      return { status: "pricing-conflict" as const };
    }

    const [purchase] = await tx.insert(memberSubscriptionAddons).values({
      memberSubscriptionId: subscriptionId,
      addonId,
      status: "pending",
    }).returning({ id: memberSubscriptionAddons.id });
    if (!purchase) throw new Error("Subscription add-on purchase was not created");
    return { status: "created" as const, purchaseId: purchase.id };
  });
}

export async function cancelSubscriptionAddon(locationId: string, purchaseId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${memberSubscriptionAddons.id}
      from ${memberSubscriptionAddons}
      inner join ${memberSubscriptions}
        on ${memberSubscriptions.id} = ${memberSubscriptionAddons.memberSubscriptionId}
      where ${memberSubscriptionAddons.id} = ${purchaseId}
        and ${memberSubscriptions.locationId} = ${locationId}
      for update
    `);
    const purchase = await tx.query.memberSubscriptionAddons.findFirst({
      where: eq(memberSubscriptionAddons.id, purchaseId),
      with: {
        subscription: { columns: { locationId: true } },
        bundlePurchase: { columns: { id: true, status: true } },
        bundleComponent: { columns: { required: true } },
      },
    });
    if (!purchase || purchase.subscription?.locationId !== locationId) return { status: "not-found" as const };
    if (
      purchase.bundlePurchaseId
      && purchase.bundleComponent?.required
      && purchase.bundlePurchase
      && ["pending", "active"].includes(purchase.bundlePurchase.status)
    ) {
      return {
        status: "bundle-cancel-required" as const,
        bundlePurchaseId: purchase.bundlePurchaseId,
      };
    }
    if (["canceled", "expired"].includes(purchase.status)) {
      return { status: "unchanged" as const, runAt: null };
    }

    const now = new Date();
    const runAt = purchase.status === "active" && purchase.paidPeriodEndsAt && purchase.paidPeriodEndsAt > now
      ? purchase.paidPeriodEndsAt
      : now;
    const cancelImmediately = runAt <= now;
    await tx.update(memberSubscriptionAddons).set(cancelImmediately ? {
      status: "canceled",
      cancelAt: now,
      canceledAt: now,
      endedAt: now,
      nextBillAt: null,
      updated: now,
    } : {
      cancelAt: runAt,
      nextBillAt: null,
      updated: now,
    }).where(eq(memberSubscriptionAddons.id, purchaseId));

    if (cancelImmediately) {
      await tx.update(memberInvoices).set({
        status: "void",
        updated: now,
      }).where(and(
        eq(memberInvoices.memberSubscriptionAddonId, purchaseId),
        inArray(memberInvoices.status, ["draft", "sent", "unpaid"]),
      ));
    }

    return { status: "canceled" as const, runAt: cancelImmediately ? null : runAt };
  });
}

export async function getSubscriptionAddonPurchase(locationId: string, subscriptionId: string, purchaseId: string) {
  const overview = await getSubscriptionAddonOverview(locationId, subscriptionId);
  return overview?.purchases.find((purchase) => purchase.id === purchaseId) ?? null;
}

export async function getSubscriptionAddonRenewal(locationId: string, purchaseId: string) {
  const purchase = await db.query.memberSubscriptionAddons.findFirst({
    where: eq(memberSubscriptionAddons.id, purchaseId),
    columns: { id: true, status: true, nextBillAt: true, bundlePurchaseId: true },
    with: { subscription: { columns: { locationId: true } } },
  });
  if (!purchase || purchase.subscription?.locationId !== locationId) return null;
  return purchase.status === "active" && purchase.nextBillAt
    ? { purchaseId: purchase.id, runAt: purchase.nextBillAt, bundlePurchaseId: purchase.bundlePurchaseId }
    : { purchaseId: purchase.id, runAt: null, bundlePurchaseId: purchase.bundlePurchaseId };
}
