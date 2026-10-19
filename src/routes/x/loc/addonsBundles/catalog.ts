import { getCurrency } from "@/utils/getCurrency";
import { db, type DbReader, type DbTransaction } from "@/db/db";
import {
  addonPlanPriceOverrides,
  addons,
  locations,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberPlanPricing,
  memberPlans,
  memberSubscriptionAddons,
} from "@/subtrees/schemas";
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
} from "@/subtrees/types";
import { and, asc, eq } from "drizzle-orm";
import { getComponentNames } from "@/handlers/addonsBundles/bundleSummary";

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

async function serializeBundles(reader: DbReader, bundleRows: BundleRow[]): Promise<BundleCatalogItem[]> {
  if (bundleRows.length === 0) return [];

  const { pricingNames, addonNames } = await getComponentNames(reader, bundleRows.flatMap((bundle) => bundle.components));

  return bundleRows.map((bundle) => ({
    ...bundle,
    created: bundle.created.toISOString(),
    updated: bundle.updated?.toISOString() ?? null,
    components: bundle.components.map((component) => ({
      ...component,
      created: component.created.toISOString(),
      updated: component.updated?.toISOString() ?? null,
      displayName: component.memberPlanPricingId
        ? pricingNames.get(component.memberPlanPricingId)!
        : addonNames.get(component.addonId!)!,
      targetMemberPlanPricingId: component.targetSubscriptionComponentId
        ? bundle.components.find((candidate) => candidate.id === component.targetSubscriptionComponentId)?.memberPlanPricingId ?? null
        : null,
    })),
  }));
}

async function getAddonRows(reader: DbReader, locationId: string, addonId?: string) {
  return reader.query.addons.findMany({
    where: and(eq(addons.locationId, locationId), addonId ? eq(addons.id, addonId) : undefined),
    with: {
      planPriceOverrides: {
        where: eq(addonPlanPriceOverrides.archived, false),
        orderBy: [asc(addonPlanPriceOverrides.created)],
      },
    },
    orderBy: [asc(addons.archived), asc(addons.name)],
  });
}

async function getBundleRows(reader: DbReader, locationId: string, bundleId?: string) {
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
  tx: DbTransaction,
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

/** The add-on columns the editor sets. */
function addonFields({ name, description, amount, billingType, interval, intervalThreshold, classAccessOverride }: AddonEditorInput) {
  return { name: name.trim(), description, amount, billingType, interval, intervalThreshold, classAccessOverride };
}

async function insertAddonDefinition(
  tx: DbTransaction,
  locationId: string,
  input: AddonEditorInput,
) {
  const location = await tx.query.locations.findFirst({ where: eq(locations.id, locationId), columns: { country: true } });
  if (!location) throw new Error("Location was not found");
  const [addon] = await tx.insert(addons).values({ locationId, ...addonFields(input), currency: getCurrency(location.country) })
    .returning({ id: addons.id });
  if (!addon) throw new Error("Add-on was not created");

  await insertAddonMappings(tx, addon.id, input);
  return (await getAddon(locationId, addon.id, tx))!;
}

async function insertBundleComponents(
  tx: DbTransaction,
  bundleId: string,
  input: BundleEditorInput,
) {
  const subscriptionInputs = input.components.flatMap((component, sortOrder) => component.type === "subscription"
    ? [{ component, sortOrder }]
    : []);
  const insertedSubscriptions = await tx.insert(bundleComponents).values(subscriptionInputs.map(({ component, sortOrder }) => ({
    bundleId,
    memberPlanPricingId: component.memberPlanPricingId,
    priceOverride: component.priceOverride,
    required: component.required,
    sortOrder,
  }))).returning({
    id: bundleComponents.id,
    memberPlanPricingId: bundleComponents.memberPlanPricingId,
  });
  const subscriptionComponentByPricing = new Map(insertedSubscriptions.map((component) => [
    component.memberPlanPricingId!,
    component.id,
  ]));
  const addonInputs = input.components.flatMap((component, sortOrder) => component.type === "addon"
    ? [{ component, sortOrder }]
    : []);

  if (addonInputs.length > 0) {
    await tx.insert(bundleComponents).values(addonInputs.map(({ component, sortOrder }) => ({
      bundleId,
      addonId: component.addonId,
      targetSubscriptionComponentId: subscriptionComponentByPricing.get(component.targetMemberPlanPricingId)!,
      priceOverride: component.priceOverride,
      required: component.required,
      sortOrder,
    })));
  }
}

/** A plan price with its plan's name, as the add-on and bundle pickers show it. */
export const pricingColumns = {
  id: memberPlanPricing.id,
  memberPlanId: memberPlanPricing.memberPlanId,
  name: memberPlanPricing.name,
  price: memberPlanPricing.price,
  interval: memberPlanPricing.interval,
  intervalThreshold: memberPlanPricing.intervalThreshold,
  planName: memberPlans.name,
};

export async function getCatalogOptions(locationId: string): Promise<AddonBundleCatalogOptions> {
  const planPricings = await db.select(pricingColumns).from(memberPlanPricing)
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

  const location = await db.query.locations.findFirst({ where: eq(locations.id, locationId), columns: { country: true } });
  if (!location) throw new Error("Location was not found");
  return { planPricings, addons: addonOptions, currency: getCurrency(location.country) };
}

export async function listAddons(locationId: string) {
  return (await getAddonRows(db, locationId)).map(serializeAddon);
}

export async function getAddon(locationId: string, addonId: string, reader: DbReader = db) {
  const [addon] = await getAddonRows(reader, locationId, addonId);
  return addon ? serializeAddon(addon) : null;
}

export async function createAddon(locationId: string, input: AddonEditorInput) {
  return db.transaction((tx) => insertAddonDefinition(tx, locationId, input));
}

export async function updateAddon(locationId: string, addonId: string, input: AddonEditorInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ archived: addons.archived, currency: addons.currency }).from(addons)
      .where(and(eq(addons.id, addonId), eq(addons.locationId, locationId))).for("update");
    if (!existing) return { status: "not-found" as const };

    const location = await tx.query.locations.findFirst({ where: eq(locations.id, locationId), columns: { country: true } });
    if (!location) throw new Error("Location was not found");
    if (existing.currency.toUpperCase() !== getCurrency(location.country)) {
      return { status: "currency-repair-required" as const };
    }
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

    await tx.update(addons).set({ ...addonFields(input), updated: now }).where(eq(addons.id, addonId));

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

export async function listBundles(locationId: string) {
  return serializeBundles(db, await getBundleRows(db, locationId));
}

export async function getBundle(locationId: string, bundleId: string, reader: DbReader = db) {
  const bundleItems = await serializeBundles(reader, await getBundleRows(reader, locationId, bundleId));
  return bundleItems[0] ?? null;
}

/** Inserts a bundle with its components and returns the new bundle's id. */
async function insertBundleDefinition(tx: DbTransaction, locationId: string, input: BundleEditorInput) {
  const [bundle] = await tx.insert(bundles).values({ locationId, name: input.name.trim(), description: input.description })
    .returning({ id: bundles.id });
  if (!bundle) throw new Error("Bundle was not created");

  await insertBundleComponents(tx, bundle.id, input);
  return bundle.id;
}

export async function createBundle(locationId: string, input: BundleEditorInput) {
  return db.transaction(async (tx) => {
    const bundleId = await insertBundleDefinition(tx, locationId, input);
    return (await getBundle(locationId, bundleId, tx))!;
  });
}

export async function updateBundle(locationId: string, bundleId: string, input: BundleEditorInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ archived: bundles.archived }).from(bundles)
      .where(and(eq(bundles.id, bundleId), eq(bundles.locationId, locationId))).for("update");
    if (!existing) return { status: "not-found" as const };

    const purchase = await tx.query.bundlePurchases.findFirst({
      where: eq(bundlePurchases.bundleId, bundleId),
      columns: { id: true },
    });
    const now = new Date();

    if (purchase) {
      if (existing.archived) return { status: "archived" as const };

      const replacementId = await insertBundleDefinition(tx, locationId, input);
      await tx.update(bundles).set({ archived: true, updated: now }).where(eq(bundles.id, bundleId));

      return { status: "versioned" as const, bundle: (await getBundle(locationId, replacementId, tx))! };
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
