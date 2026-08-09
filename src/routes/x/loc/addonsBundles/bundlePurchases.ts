import { db } from "@/db/db";
import { calculateThresholdDate } from "@/utils";
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
} from "@subtrees/schemas";
import type {
  BundlePurchaseResponse,
  PurchaseBundleInput,
  SubscriptionBundleSummary,
} from "@subtrees/types";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  hasConflictingAddonPriceOverrides,
  OPEN_ADDON_PURCHASE_STATUSES,
} from "./subscriptionAddonPricing";

type BundlePurchaseResult =
  | { status: "created"; value: BundlePurchaseResponse }
  | { status: "member-not-found" | "bundle-not-found" | "invalid-components" | "pricing-conflict"; error: string };

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

  return {
    ...purchase,
    startsAt: purchase.startsAt.toISOString(),
    endedAt: purchase.endedAt?.toISOString() ?? null,
    components: componentRows.filter((component) => purchasedComponentIds.has(component.id)).map((component) => ({
      id: component.id,
      type: component.memberPlanPricingId ? "subscription" as const : "addon" as const,
      name: component.memberPlanPricingId
        ? pricingNames.get(component.memberPlanPricingId) ?? "Subscription"
        : addonNames.get(component.addonId!) ?? "Add-on",
      priceOverride: component.priceOverride,
      required: component.required,
      memberSubscriptionId: subscriptionsByComponent.get(component.id) ?? null,
      memberSubscriptionAddonId: addonsByComponent.get(component.id) ?? null,
    })),
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

export async function purchaseBundle(
  locationId: string,
  memberId: string,
  input: PurchaseBundleInput,
): Promise<BundlePurchaseResult> {
  const result = await db.transaction(async (tx) => {
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
    });
    if (!memberLocation) {
      return { status: "member-not-found" as const, error: "Member not found in this location" };
    }

    const bundle = await tx.query.bundles.findFirst({
      where: and(eq(bundles.id, input.bundleId), eq(bundles.locationId, locationId), eq(bundles.archived, false)),
      with: { components: { orderBy: [asc(bundleComponents.sortOrder)] } },
    });
    if (!bundle) return { status: "bundle-not-found" as const, error: "Bundle not found" };

    const componentIds = new Set(bundle.components.map((component) => component.id));
    if (input.selectedOptionalComponentIds.some((id) => !componentIds.has(id))) {
      return { status: "invalid-components" as const, error: "The bundle selection contains an unknown component" };
    }
    const selectedOptionalIds = new Set(input.selectedOptionalComponentIds);
    const selectedComponents = bundle.components.filter((component) => component.required || selectedOptionalIds.has(component.id));
    const selectedSubscriptionComponentIds = new Set(selectedComponents.flatMap((component) =>
      component.memberPlanPricingId ? [component.id] : []
    ));
    if (selectedSubscriptionComponentIds.size === 0) {
      return { status: "invalid-components" as const, error: "A bundle purchase needs at least one subscription" };
    }
    if (selectedComponents.some((component) =>
      component.addonId && !selectedSubscriptionComponentIds.has(component.targetSubscriptionComponentId ?? "")
    )) {
      return {
        status: "invalid-components" as const,
        error: "Every selected add-on must be attached to a selected subscription",
      };
    }

    const pricingIds = selectedComponents.flatMap((component) => component.memberPlanPricingId ? [component.memberPlanPricingId] : []);
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
      .where(and(inArray(memberPlanPricing.id, pricingIds), eq(memberPlans.locationId, locationId)));
    if (pricingRows.length !== pricingIds.length || pricingRows.some((pricing) => !pricing.interval || !pricing.intervalThreshold)) {
      return { status: "invalid-components" as const, error: "The bundle contains an unavailable subscription price" };
    }

    const now = new Date();
    const startsAt = input.startDate ? new Date(input.startDate) : now;
    if (Number.isNaN(startsAt.getTime())) {
      return { status: "invalid-components" as const, error: "Start date is invalid" };
    }
    if (startsAt.getTime() > now.getTime()) {
      return { status: "invalid-components" as const, error: "Future bundle start dates are not supported yet" };
    }
    const pricingById = new Map(pricingRows.map((pricing) => [pricing.id, pricing]));
    const selectedComponentsById = new Map(selectedComponents.map((component) => [component.id, component]));
    const addonIdsByTargetComponent = new Map<string, string[]>();
    for (const component of selectedComponents) {
      if (!component.addonId || !component.targetSubscriptionComponentId) continue;
      const addonIds = addonIdsByTargetComponent.get(component.targetSubscriptionComponentId) ?? [];
      addonIds.push(component.addonId);
      addonIdsByTargetComponent.set(component.targetSubscriptionComponentId, addonIds);
    }
    const pricingConflicts = await Promise.all([...addonIdsByTargetComponent].map(([targetComponentId, addonIds]) => {
      const sourcePlanPricingId = selectedComponentsById.get(targetComponentId)?.memberPlanPricingId;
      return sourcePlanPricingId
        ? hasConflictingAddonPriceOverrides(sourcePlanPricingId, addonIds, startsAt)
        : Promise.resolve(false);
    }));
    if (pricingConflicts.some(Boolean)) {
      return {
        status: "pricing-conflict" as const,
        error: "Selected add-ons would apply conflicting subscription prices",
      };
    }

    const [purchase] = await tx.insert(bundlePurchases).values({
      bundleId: bundle.id,
      memberId,
      status: "pending",
      startsAt,
    }).returning({ id: bundlePurchases.id });
    if (!purchase) throw new Error("Bundle purchase was not created");

    const subscriptionByComponent = new Map<string, string>();
    for (const component of selectedComponents) {
      if (!component.memberPlanPricingId) continue;
      const pricing = pricingById.get(component.memberPlanPricingId)!;
      const periodEnd = calculateThresholdDate({
        startDate: startsAt,
        threshold: pricing.intervalThreshold!,
        interval: pricing.interval!,
      }) ?? startsAt;
      const cancelAt = pricing.expireInterval && pricing.expireThreshold
        ? calculateThresholdDate({
          startDate: startsAt,
          threshold: pricing.expireThreshold,
          interval: pricing.expireInterval,
        }) ?? null
        : null;
      const [subscription] = await tx.insert(memberSubscriptions).values({
        memberId,
        memberPlanPricingId: component.memberPlanPricingId,
        locationId,
        startDate: startsAt,
        currentPeriodStart: startsAt,
        currentPeriodEnd: periodEnd,
        cancelAt,
        status: "incomplete",
        paymentType: input.paymentType,
        bundlePurchaseId: purchase.id,
        bundleComponentId: component.id,
        classCredits: pricing.classLimitInterval === "term" ? pricing.totalClassLimit ?? 0 : 0,
        metadata: { bundlePurchaseId: purchase.id },
      }).returning({ id: memberSubscriptions.id });
      if (!subscription) throw new Error("Bundled subscription was not created");
      subscriptionByComponent.set(component.id, subscription.id);
    }

    const addonPurchases = selectedComponents.flatMap((component) => {
      if (!component.addonId || !component.targetSubscriptionComponentId) return [];
      return [{
        memberSubscriptionId: subscriptionByComponent.get(component.targetSubscriptionComponentId)!,
        addonId: component.addonId,
        status: "pending" as const,
        startsAt,
        bundlePurchaseId: purchase.id,
        bundleComponentId: component.id,
      }];
    });
    const insertedAddonPurchases = addonPurchases.length === 0 ? [] : await tx.insert(memberSubscriptionAddons)
      .values(addonPurchases)
      .returning({ id: memberSubscriptionAddons.id });

    return {
      status: "created" as const,
      bundlePurchaseId: purchase.id,
      subscriptionIds: [...subscriptionByComponent.values()],
      addonPurchaseIds: insertedAddonPurchases.map((addon) => addon.id),
    };
  });

  if (result.status !== "created") return result;
  const purchase = await getBundlePurchaseSummary(locationId, result.bundlePurchaseId);
  if (!purchase) throw new Error("Bundle purchase was not found after creation");
  return {
    status: "created",
    value: {
      purchase,
      subscriptionIds: result.subscriptionIds,
      addonPurchaseIds: result.addonPurchaseIds,
    },
  };
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
        subscriptions: { columns: { id: true, memberPlanPricingId: true, status: true } },
        addonPurchases: { columns: { id: true, status: true, bundleComponentId: true } },
      },
    });
    if (!purchase || purchase.bundle?.locationId !== locationId) return { status: "not-found" as const };
    if (purchase.status === "canceled" || purchase.status === "expired") {
      return { status: "inactive" as const };
    }
    if (purchase.subscriptions.some((subscription) => !["active", "trialing"].includes(subscription.status))) {
      return { status: "subscriptions-not-ready" as const };
    }
    const subscriptionIds = purchase.subscriptions.map((subscription) => subscription.id);
    const openAddonPurchases = subscriptionIds.length === 0 ? [] : await tx.select({
      memberSubscriptionId: memberSubscriptionAddons.memberSubscriptionId,
      addonId: memberSubscriptionAddons.addonId,
    }).from(memberSubscriptionAddons).where(and(
      inArray(memberSubscriptionAddons.memberSubscriptionId, subscriptionIds),
      inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
    ));
    const pricingConflicts = await Promise.all(purchase.subscriptions.map((subscription) =>
      hasConflictingAddonPriceOverrides(
        subscription.memberPlanPricingId,
        openAddonPurchases
          .filter((addon) => addon.memberSubscriptionId === subscription.id)
          .map((addon) => addon.addonId),
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
      addonPurchaseIds: purchase.addonPurchases
        .filter((addon) => addon.status === "pending")
        .map((addon) => addon.id),
    };
  });
}

export async function cancelBundlePurchase(locationId: string, bundlePurchaseId: string, reason?: string) {
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
    if (!purchase || purchase.bundle?.locationId !== locationId) return { status: "not-found" as const };
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
