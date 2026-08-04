import { db } from "@/db/db";
import {
  addonPlanPriceOverrides,
  addons,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberPlanPricing,
  memberPlans,
  memberSubscriptionAddons,
} from "@subtrees/schemas";
import type {
  Addon,
  AddonBundleCatalogOptions,
  AddonCatalogItem,
  AddonEditorInput,
  AddonPlanPriceOverride,
  Bundle,
  BundleCatalogItem,
  BundleComponent,
  BundleEditorInput,
} from "@subtrees/types";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

type CatalogReader = Pick<typeof db, "query" | "select">;
type AddonRow = Addon & { planPriceOverrides: AddonPlanPriceOverride[] };
type BundleRow = Bundle & { components: BundleComponent[] };

function serializeAddon(addon: AddonRow): AddonCatalogItem {
  return {
    ...addon,
    created: addon.created.toISOString(),
    updated: addon.updated?.toISOString() ?? null,
    planPriceOverrides: addon.planPriceOverrides.map((override) => ({
      ...override,
      startsAt: override.startsAt?.toISOString() ?? null,
      endsAt: override.endsAt?.toISOString() ?? null,
      created: override.created.toISOString(),
      updated: override.updated?.toISOString() ?? null,
    })),
  };
}

async function serializeBundles(reader: CatalogReader, bundleRows: BundleRow[]): Promise<BundleCatalogItem[]> {
  if (bundleRows.length === 0) return [];

  const planPricingIds = Array.from(new Set(bundleRows.flatMap((bundle) =>
    bundle.components.flatMap((component) => component.memberPlanPricingId ? [component.memberPlanPricingId] : [])
  )));
  const addonIds = Array.from(new Set(bundleRows.flatMap((bundle) =>
    bundle.components.flatMap((component) => component.addonId ? [component.addonId] : [])
  )));

  const planPricingRows = planPricingIds.length === 0 ? [] : await reader.select({
    id: memberPlanPricing.id,
    name: memberPlanPricing.name,
    planName: memberPlans.name,
  }).from(memberPlanPricing)
    .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
    .where(inArray(memberPlanPricing.id, planPricingIds));
  const addonRows = addonIds.length === 0 ? [] : await reader.select({
    id: addons.id,
    name: addons.name,
  }).from(addons).where(inArray(addons.id, addonIds));

  const planPricingNames = new Map(planPricingRows.map((pricing) => [pricing.id, `${pricing.planName} · ${pricing.name}`]));
  const addonNames = new Map(addonRows.map((addon) => [addon.id, addon.name]));

  return bundleRows.map((bundle) => ({
    ...bundle,
    created: bundle.created.toISOString(),
    updated: bundle.updated?.toISOString() ?? null,
    components: bundle.components.map((component) => ({
      ...component,
      created: component.created.toISOString(),
      updated: component.updated?.toISOString() ?? null,
      displayName: component.memberPlanPricingId
        ? planPricingNames.get(component.memberPlanPricingId)!
        : addonNames.get(component.addonId!)!,
    })),
  }));
}

async function loadAddonRows(reader: CatalogReader, locationId: string, addonId?: string) {
  return reader.query.addons.findMany({
    where: addonId
      ? and(eq(addons.locationId, locationId), eq(addons.id, addonId))
      : eq(addons.locationId, locationId),
    with: {
      planPriceOverrides: {
        where: eq(addonPlanPriceOverrides.archived, false),
        orderBy: [asc(addonPlanPriceOverrides.created)],
      },
    },
    orderBy: [asc(addons.archived), asc(addons.name)],
  });
}

async function loadBundleRows(reader: CatalogReader, locationId: string, bundleId?: string) {
  return reader.query.bundles.findMany({
    where: bundleId
      ? and(eq(bundles.locationId, locationId), eq(bundles.id, bundleId))
      : eq(bundles.locationId, locationId),
    with: {
      components: {
        orderBy: [asc(bundleComponents.sortOrder)],
      },
    },
    orderBy: [asc(bundles.archived), asc(bundles.name)],
  });
}

async function insertAddonMappings(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  addonId: string,
  input: AddonEditorInput,
) {
  if (input.planPriceOverrides.length === 0) return;

  await tx.insert(addonPlanPriceOverrides).values(input.planPriceOverrides.map((mapping) => ({
    addonId,
    sourcePlanPricingId: mapping.sourcePlanPricingId,
    replacementPlanPricingId: mapping.replacementPlanPricingId,
  })));
}

async function insertAddonDefinition(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  locationId: string,
  input: AddonEditorInput,
) {
  const [addon] = await tx.insert(addons).values({
    locationId,
    name: input.name.trim(),
    description: input.description,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    billingType: input.billingType,
    interval: input.interval,
    intervalThreshold: input.intervalThreshold,
    classAccessOverride: input.classAccessOverride,
  }).returning({ id: addons.id });
  if (!addon) throw new Error("Add-on was not created");

  await insertAddonMappings(tx, addon.id, input);
  return (await getAddon(locationId, addon.id, tx))!;
}

async function insertBundleComponents(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bundleId: string,
  input: BundleEditorInput,
) {
  await tx.insert(bundleComponents).values(input.components.map((component, sortOrder) => {
    const common = {
      bundleId,
      priceOverride: component.priceOverride,
      required: component.required,
      sortOrder,
    };

    return component.type === "subscription"
      ? { ...common, memberPlanPricingId: component.memberPlanPricingId }
      : { ...common, addonId: component.addonId };
  }));
}

export async function getCatalogOptions(locationId: string): Promise<AddonBundleCatalogOptions> {
  const planPricings = await db.select({
    id: memberPlanPricing.id,
    memberPlanId: memberPlanPricing.memberPlanId,
    name: memberPlanPricing.name,
    price: memberPlanPricing.price,
    interval: memberPlanPricing.interval,
    intervalThreshold: memberPlanPricing.intervalThreshold,
    planName: memberPlans.name,
  }).from(memberPlanPricing)
    .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
    .where(and(
      eq(memberPlans.locationId, locationId),
      eq(memberPlans.archived, false),
      eq(memberPlans.type, "recurring"),
    ))
    .orderBy(asc(memberPlans.name), asc(memberPlanPricing.name));
  const addonOptions = await db.select({
    id: addons.id,
    name: addons.name,
    amount: addons.amount,
    currency: addons.currency,
    billingType: addons.billingType,
    interval: addons.interval,
    intervalThreshold: addons.intervalThreshold,
  }).from(addons)
    .where(and(eq(addons.locationId, locationId), eq(addons.archived, false)))
    .orderBy(asc(addons.name));

  return { planPricings, addons: addonOptions };
}

export async function listAddons(locationId: string) {
  return (await loadAddonRows(db, locationId)).map(serializeAddon);
}

export async function getAddon(locationId: string, addonId: string, reader: CatalogReader = db) {
  const [addon] = await loadAddonRows(reader, locationId, addonId);
  return addon ? serializeAddon(addon) : null;
}

export async function createAddon(locationId: string, input: AddonEditorInput) {
  return db.transaction((tx) => insertAddonDefinition(tx, locationId, input));
}

export async function updateAddon(locationId: string, addonId: string, input: AddonEditorInput) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${addons.id}
      from ${addons}
      where ${addons.id} = ${addonId}
        and ${addons.locationId} = ${locationId}
      for update
    `);
    const existing = await tx.query.addons.findFirst({
      where: and(eq(addons.id, addonId), eq(addons.locationId, locationId)),
      columns: { id: true, archived: true },
    });
    if (!existing) return { status: "not-found" as const };

    const purchase = await tx.query.memberSubscriptionAddons.findFirst({
      where: eq(memberSubscriptionAddons.addonId, addonId),
      columns: { id: true },
    });
    const now = new Date();

    if (purchase) {
      if (existing.archived) return { status: "archived" as const };

      const replacement = await insertAddonDefinition(tx, locationId, input);
      await tx.update(addons).set({ archived: true, updated: now }).where(eq(addons.id, addonId));
      return { status: "versioned" as const, addon: replacement };
    }

    await tx.update(addons).set({
      name: input.name.trim(),
      description: input.description,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      billingType: input.billingType,
      interval: input.interval,
      intervalThreshold: input.intervalThreshold,
      classAccessOverride: input.classAccessOverride,
      updated: now,
    }).where(eq(addons.id, addonId));

    await tx.update(addonPlanPriceOverrides).set({
      archived: true,
      endsAt: now,
      updated: now,
    }).where(and(
      eq(addonPlanPriceOverrides.addonId, addonId),
      eq(addonPlanPriceOverrides.archived, false),
    ));
    await insertAddonMappings(tx, addonId, input);

    return { status: "updated" as const, addon: (await getAddon(locationId, addonId, tx))! };
  });
}

export async function archiveAddon(locationId: string, addonId: string) {
  const [addon] = await db.update(addons).set({
    archived: true,
    updated: new Date(),
  }).where(and(eq(addons.id, addonId), eq(addons.locationId, locationId))).returning({ id: addons.id });

  return addon ? getAddon(locationId, addonId) : null;
}

export async function listBundles(locationId: string) {
  return serializeBundles(db, await loadBundleRows(db, locationId));
}

export async function getBundle(locationId: string, bundleId: string, reader: CatalogReader = db) {
  const bundleItems = await serializeBundles(reader, await loadBundleRows(reader, locationId, bundleId));
  return bundleItems[0] ?? null;
}

export async function createBundle(locationId: string, input: BundleEditorInput) {
  return db.transaction(async (tx) => {
    const [bundle] = await tx.insert(bundles).values({
      locationId,
      name: input.name.trim(),
      description: input.description,
    }).returning();
    if (!bundle) throw new Error("Bundle was not created");

    await insertBundleComponents(tx, bundle.id, input);
    return (await getBundle(locationId, bundle.id, tx))!;
  });
}

export async function updateBundle(locationId: string, bundleId: string, input: BundleEditorInput) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${bundles.id}
      from ${bundles}
      where ${bundles.id} = ${bundleId}
        and ${bundles.locationId} = ${locationId}
      for update
    `);
    const existing = await tx.query.bundles.findFirst({
      where: and(eq(bundles.id, bundleId), eq(bundles.locationId, locationId)),
      columns: { id: true, archived: true },
    });
    if (!existing) return { status: "not-found" as const };

    const purchase = await tx.query.bundlePurchases.findFirst({
      where: eq(bundlePurchases.bundleId, bundleId),
      columns: { id: true },
    });
    const now = new Date();

    if (purchase) {
      if (existing.archived) return { status: "archived" as const };

      const [replacement] = await tx.insert(bundles).values({
        locationId,
        name: input.name.trim(),
        description: input.description,
      }).returning({ id: bundles.id });
      if (!replacement) throw new Error("Replacement bundle was not created");

      await insertBundleComponents(tx, replacement.id, input);
      await tx.update(bundles).set({ archived: true, updated: now }).where(eq(bundles.id, bundleId));

      return { status: "versioned" as const, bundle: (await getBundle(locationId, replacement.id, tx))! };
    }

    await tx.update(bundles).set({
      name: input.name.trim(),
      description: input.description,
      updated: now,
    }).where(eq(bundles.id, bundleId));
    await tx.delete(bundleComponents).where(eq(bundleComponents.bundleId, bundleId));
    await insertBundleComponents(tx, bundleId, input);

    return { status: "updated" as const, bundle: (await getBundle(locationId, bundleId, tx))! };
  });
}

export async function archiveBundle(locationId: string, bundleId: string) {
  const [bundle] = await db.update(bundles).set({
    archived: true,
    updated: new Date(),
  }).where(and(eq(bundles.id, bundleId), eq(bundles.locationId, locationId))).returning({ id: bundles.id });

  return bundle ? getBundle(locationId, bundleId) : null;
}
