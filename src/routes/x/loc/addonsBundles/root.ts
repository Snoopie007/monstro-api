import type {
  AddonBundleCatalogOptions,
  AddonCatalogItem,
  AddonEditorInput,
  BundleCatalogItem,
  BundleEditorInput,
} from "@subtrees/types";
import { Elysia } from "elysia";
import {
  addonEditorBody,
  bundleEditorBody,
  validateAddonEditorInput,
  validateBundleEditorInput,
} from "./input";

const created = "2026-08-01T08:00:00.000Z";

const planPricings: AddonBundleCatalogOptions["planPricings"] = [
  { id: "mpp_singles_month_regular", memberPlanId: "plan_singles", planName: "Singles", name: "Month-to-month regular", price: 50000, interval: "month", intervalThreshold: 1 },
  { id: "mpp_singles_month_member", memberPlanId: "plan_singles", planName: "Singles", name: "Month-to-month member", price: 35000, interval: "month", intervalThreshold: 1 },
  { id: "mpp_singles_6_regular", memberPlanId: "plan_singles", planName: "Singles", name: "6-month regular", price: 50000, interval: "month", intervalThreshold: 1 },
  { id: "mpp_singles_6_member", memberPlanId: "plan_singles", planName: "Singles", name: "6-month member", price: 27500, interval: "month", intervalThreshold: 1 },
  { id: "mpp_doubles_month_regular", memberPlanId: "plan_doubles", planName: "Doubles", name: "Month-to-month regular", price: 85000, interval: "month", intervalThreshold: 1 },
  { id: "mpp_doubles_month_member", memberPlanId: "plan_doubles", planName: "Doubles", name: "Month-to-month member", price: 68250, interval: "month", intervalThreshold: 1 },
  { id: "mpp_doubles_12_regular", memberPlanId: "plan_doubles", planName: "Doubles", name: "12-month regular", price: 82500, interval: "month", intervalThreshold: 1 },
  { id: "mpp_doubles_12_member", memberPlanId: "plan_doubles", planName: "Doubles", name: "12-month member", price: 46250, interval: "month", intervalThreshold: 1 },
];

function mockAddons(locationId: string): AddonCatalogItem[] {
  return [
    {
      id: "adn_studio_annual",
      locationId,
      name: "Annual Studio Membership",
      description: "Annual membership benefits with unlimited group sessions.",
      amount: 19900,
      currency: "USD",
      billingType: "recurring",
      interval: "year",
      intervalThreshold: 1,
      classAccessOverride: "unlimited",
      archived: false,
      created,
      updated: null,
      planPriceOverrides: [
        { id: "aov_single_month", addonId: "adn_studio_annual", sourcePlanPricingId: "mpp_singles_month_regular", replacementPlanPricingId: "mpp_singles_month_member", startsAt: null, endsAt: null, archived: false, created, updated: null },
        { id: "aov_single_6", addonId: "adn_studio_annual", sourcePlanPricingId: "mpp_singles_6_regular", replacementPlanPricingId: "mpp_singles_6_member", startsAt: null, endsAt: null, archived: false, created, updated: null },
      ],
    },
    {
      id: "adn_online_annual",
      locationId,
      name: "Annual Online Membership",
      description: "Online portal access, newsletter, private group, and unlimited group sessions.",
      amount: 59900,
      currency: "USD",
      billingType: "recurring",
      interval: "year",
      intervalThreshold: 1,
      classAccessOverride: "unlimited",
      archived: false,
      created,
      updated: null,
      planPriceOverrides: [
        { id: "aov_double_month", addonId: "adn_online_annual", sourcePlanPricingId: "mpp_doubles_month_regular", replacementPlanPricingId: "mpp_doubles_month_member", startsAt: null, endsAt: null, archived: false, created, updated: null },
        { id: "aov_double_12", addonId: "adn_online_annual", sourcePlanPricingId: "mpp_doubles_12_regular", replacementPlanPricingId: "mpp_doubles_12_member", startsAt: null, endsAt: null, archived: false, created, updated: null },
      ],
    },
    {
      id: "adn_studio_five_year",
      locationId,
      name: "Five-Year Studio Membership",
      description: "Long-term studio membership option billed once every five years.",
      amount: 125000,
      currency: "USD",
      billingType: "recurring",
      interval: "year",
      intervalThreshold: 5,
      classAccessOverride: "unlimited",
      archived: true,
      created,
      updated: null,
      planPriceOverrides: [],
    },
  ];
}

function mockBundles(locationId: string): BundleCatalogItem[] {
  return [
    {
      id: "bnd_singles_annual",
      locationId,
      name: "Singles + Annual Membership",
      description: "Singles monthly subscription packaged with the Annual Studio Membership.",
      archived: false,
      created,
      updated: null,
      components: [
        { id: "bcmp_singles_sub", bundleId: "bnd_singles_annual", memberPlanPricingId: "mpp_singles_month_regular", addonId: null, priceOverride: 32000, required: true, sortOrder: 0, created, updated: null, displayName: "Singles · Month-to-month regular" },
        { id: "bcmp_singles_addon", bundleId: "bnd_singles_annual", memberPlanPricingId: null, addonId: "adn_studio_annual", priceOverride: null, required: true, sortOrder: 1, created, updated: null, displayName: "Annual Studio Membership" },
      ],
    },
    {
      id: "bnd_doubles_online",
      locationId,
      name: "Doubles + Online Membership",
      description: "Doubles monthly subscription with the Annual Online Membership.",
      archived: false,
      created,
      updated: null,
      components: [
        { id: "bcmp_doubles_sub", bundleId: "bnd_doubles_online", memberPlanPricingId: "mpp_doubles_month_regular", addonId: null, priceOverride: 65000, required: true, sortOrder: 0, created, updated: null, displayName: "Doubles · Month-to-month regular" },
        { id: "bcmp_doubles_addon", bundleId: "bnd_doubles_online", memberPlanPricingId: null, addonId: "adn_online_annual", priceOverride: null, required: true, sortOrder: 1, created, updated: null, displayName: "Annual Online Membership" },
      ],
    },
  ];
}

function addonFromInput(locationId: string, id: string, body: AddonEditorInput): AddonCatalogItem {
  return {
    id,
    locationId,
    name: body.name,
    description: body.description,
    amount: body.amount,
    currency: body.currency,
    billingType: body.billingType,
    interval: body.interval,
    intervalThreshold: body.intervalThreshold,
    classAccessOverride: body.classAccessOverride,
    archived: false,
    created: new Date().toISOString(),
    updated: null,
    planPriceOverrides: body.planPriceOverrides.map((override, index) => ({
      id: `mock_override_${index + 1}`,
      addonId: id,
      sourcePlanPricingId: override.sourcePlanPricingId,
      replacementPlanPricingId: override.replacementPlanPricingId,
      startsAt: null,
      endsAt: null,
      archived: false,
      created: new Date().toISOString(),
      updated: null,
    })),
  };
}

function bundleFromInput(locationId: string, id: string, body: BundleEditorInput): BundleCatalogItem {
  const planNames = new Map(planPricings.map((pricing) => [pricing.id, `${pricing.planName} · ${pricing.name}`]));
  const addonNames = new Map(mockAddons(locationId).map((addon) => [addon.id, addon.name]));

  return {
    id,
    locationId,
    name: body.name,
    description: body.description,
    archived: false,
    created: new Date().toISOString(),
    updated: null,
    components: body.components.map((component, index) => {
      const subscription = component.type === "subscription";

      return {
        id: `mock_component_${index + 1}`,
        bundleId: id,
        memberPlanPricingId: subscription ? component.memberPlanPricingId : null,
        addonId: subscription ? null : component.addonId,
        priceOverride: component.priceOverride,
        required: component.required,
        sortOrder: index,
        created: new Date().toISOString(),
        updated: null,
        displayName: subscription
          ? planNames.get(component.memberPlanPricingId)!
          : addonNames.get(component.addonId)!,
      };
    }),
  };
}

// Mock-only catalog contract. These handlers intentionally do not read or write the database.
// The real bundle catalog route must join component products and return displayName so the
// catalog never needs the editor-options endpoint merely to resolve subscription/add-on labels.
// A real bundle PATCH must update an unused bundle in place, but version a purchased bundle by
// creating replacement bundle/component rows, archiving the old bundle, and returning the new ID.
// Add-on billing must use its active bundle component priceOverride before falling back to amount.
// The real write routes must repeat these cross-record checks after loading location-scoped records.
// The future add-on activation route must lock the subscription and reject a second active,
// price-affecting add-on; that concurrency rule does not belong in these catalog-only mock routes.
export const xAddonsBundles = new Elysia({ prefix: "/addons-bundles" })
  .get("/options", ({ params, status }) => {
    const { lid } = params as { lid: string };
    const addonList = mockAddons(lid);
    return status(200, {
      mock: true,
      options: {
        planPricings,
        addons: addonList.map(({ id, name, amount, currency, billingType, interval, intervalThreshold }) => ({
          id,
          name,
          amount,
          currency,
          billingType,
          interval,
          intervalThreshold,
        })),
      },
    });
  })
  .get("/addons", ({ params, status }) => {
    const { lid } = params as { lid: string };
    return status(200, { mock: true, addons: mockAddons(lid) });
  })
  .post("/addons", ({ params, body, status }) => {
    const { lid } = params as { lid: string };
    const inputError = validateAddonEditorInput(body, planPricings);
    if (inputError) return status(400, { error: inputError });
    return status(201, { mock: true, addon: addonFromInput(lid, `mock_addon_${crypto.randomUUID()}`, body) });
  }, { body: addonEditorBody })
  .get("/addons/:addonId", ({ params, status }) => {
    const { lid, addonId } = params as { lid: string; addonId: string };
    const addon = mockAddons(lid).find((item) => item.id === addonId);
    if (!addon) return status(404, { error: "Mock add-on not found" });
    return status(200, { mock: true, addon });
  })
  .patch("/addons/:addonId", ({ params, body, status }) => {
    const { lid, addonId } = params as { lid: string; addonId: string };
    const inputError = validateAddonEditorInput(body, planPricings);
    if (inputError) return status(400, { error: inputError });
    return status(200, { mock: true, addon: addonFromInput(lid, addonId, body) });
  }, { body: addonEditorBody })
  .post("/addons/:addonId/archive", ({ params, status }) => {
    const { lid, addonId } = params as { lid: string; addonId: string };
    const addon = mockAddons(lid).find((item) => item.id === addonId);
    if (!addon) return status(404, { error: "Mock add-on not found" });
    return status(200, { mock: true, addon: { ...addon, archived: true } });
  })
  .get("/bundles", ({ params, status }) => {
    const { lid } = params as { lid: string };
    return status(200, { mock: true, bundles: mockBundles(lid) });
  })
  .post("/bundles", ({ params, body, status }) => {
    const { lid } = params as { lid: string };
    const inputError = validateBundleEditorInput(body, { planPricings, addons: mockAddons(lid) });
    if (inputError) return status(400, { error: inputError });
    return status(201, { mock: true, bundle: bundleFromInput(lid, `mock_bundle_${crypto.randomUUID()}`, body) });
  }, { body: bundleEditorBody })
  .get("/bundles/:bundleId", ({ params, status }) => {
    const { lid, bundleId } = params as { lid: string; bundleId: string };
    const bundle = mockBundles(lid).find((item) => item.id === bundleId);
    if (!bundle) return status(404, { error: "Mock bundle not found" });
    return status(200, { mock: true, bundle });
  })
  .patch("/bundles/:bundleId", ({ params, body, status }) => {
    const { lid, bundleId } = params as { lid: string; bundleId: string };
    const inputError = validateBundleEditorInput(body, { planPricings, addons: mockAddons(lid) });
    if (inputError) return status(400, { error: inputError });
    return status(200, { mock: true, bundle: bundleFromInput(lid, bundleId, body) });
  }, { body: bundleEditorBody })
  .post("/bundles/:bundleId/archive", ({ params, status }) => {
    const { lid, bundleId } = params as { lid: string; bundleId: string };
    const bundle = mockBundles(lid).find((item) => item.id === bundleId);
    if (!bundle) return status(404, { error: "Mock bundle not found" });
    return status(200, { mock: true, bundle: { ...bundle, archived: true } });
  });
