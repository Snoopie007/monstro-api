import {
  addonPlanPriceOverrides,
  addons,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberSubscriptionAddons,
} from "../schemas/addonsBundles";
import type { MemberPlanPricing } from "./member";

export type Addon = typeof addons.$inferSelect;
export type NewAddon = typeof addons.$inferInsert;
export type AddonPlanPriceOverride = typeof addonPlanPriceOverrides.$inferSelect;
export type NewAddonPlanPriceOverride = typeof addonPlanPriceOverrides.$inferInsert;
export type MemberSubscriptionAddon = typeof memberSubscriptionAddons.$inferSelect;
export type NewMemberSubscriptionAddon = typeof memberSubscriptionAddons.$inferInsert;
export type Bundle = typeof bundles.$inferSelect;
export type NewBundle = typeof bundles.$inferInsert;
export type BundleComponent = typeof bundleComponents.$inferSelect;
export type NewBundleComponent = typeof bundleComponents.$inferInsert;
export type BundlePurchase = typeof bundlePurchases.$inferSelect;
export type NewBundlePurchase = typeof bundlePurchases.$inferInsert;

export type AddonPlanPriceOverrideDetail = AddonPlanPriceOverride & {
  sourcePricing?: MemberPlanPricing;
  replacementPricing?: MemberPlanPricing;
};

export type AddonDetail = Addon & {
  planPriceOverrides: AddonPlanPriceOverrideDetail[];
};

export type BundleComponentDetail = BundleComponent & {
  addon?: Addon;
  memberPlanPricing?: MemberPlanPricing;
};

export type BundleDetail = Bundle & {
  components: BundleComponentDetail[];
};

export type AddonCatalogItem = Omit<AddonDetail, "created" | "updated" | "planPriceOverrides"> & {
  created: string;
  updated: string | null;
  planPriceOverrides: Array<Omit<AddonPlanPriceOverrideDetail, "created" | "updated" | "startsAt" | "endsAt"> & {
    created: string;
    updated: string | null;
    startsAt: string | null;
    endsAt: string | null;
  }>;
};

export type BundleCatalogItem = Omit<BundleDetail, "created" | "updated" | "components"> & {
  created: string;
  updated: string | null;
  components: Array<Omit<BundleComponentDetail, "created" | "updated"> & {
    created: string;
    updated: string | null;
    displayName: string;
    targetMemberPlanPricingId: string | null;
  }>;
};

export type AddonBundlePlanPricingOption = Pick<MemberPlanPricing, "id" | "memberPlanId" | "name" | "price" | "interval" | "intervalThreshold"> & {
  planName: string;
};

export type AddonBundleCatalogOptions = {
  planPricings: AddonBundlePlanPricingOption[];
  addons: Array<Pick<AddonCatalogItem, "id" | "name" | "amount" | "currency" | "billingType" | "interval" | "intervalThreshold">>;
};

export type AddonCatalogResponse = { addons: AddonCatalogItem[] };
export type AddonDetailResponse = { addon: AddonCatalogItem };
export type BundleCatalogResponse = { bundles: BundleCatalogItem[] };
export type BundleDetailResponse = { bundle: BundleCatalogItem };
export type AddonBundleOptionsResponse = { options: AddonBundleCatalogOptions };

export type SubscriptionAddonPricing = Pick<
  AddonBundlePlanPricingOption,
  "id" | "memberPlanId" | "name" | "planName" | "price" | "interval" | "intervalThreshold"
>;

export type SubscriptionAddonPriceEffect = {
  sourcePricing: SubscriptionAddonPricing;
  replacementPricing: SubscriptionAddonPricing;
};

export type SubscriptionAddonPurchaseItem = Omit<
  MemberSubscriptionAddon,
  "startsAt" | "paidPeriodStartsAt" | "paidPeriodEndsAt" | "nextBillAt" | "cancelAt" | "canceledAt" | "endedAt" | "created" | "updated"
> & {
  startsAt: string;
  paidPeriodStartsAt: string | null;
  paidPeriodEndsAt: string | null;
  nextBillAt: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  created: string;
  updated: string | null;
  addon: Pick<Addon, "id" | "name" | "description" | "amount" | "currency" | "billingType" | "interval" | "intervalThreshold" | "classAccessOverride">;
  priceEffect: SubscriptionAddonPriceEffect | null;
  effective: boolean;
};

export type AvailableSubscriptionAddon = Pick<
  Addon,
  "id" | "name" | "description" | "amount" | "currency" | "billingType" | "interval" | "intervalThreshold" | "classAccessOverride"
> & {
  priceEffect: SubscriptionAddonPriceEffect | null;
  unavailableReason: string | null;
};

export type SubscriptionAddonOverview = {
  basePricing: SubscriptionAddonPricing;
  effectivePricing: SubscriptionAddonPricing;
  pricingSource:
    | { type: "base" }
    | { type: "addon"; memberSubscriptionAddonId: string }
    | { type: "bundle"; bundlePurchaseId: string; bundleComponentId: string };
  unlimitedClassAccess: boolean;
  purchases: SubscriptionAddonPurchaseItem[];
  availableAddons: AvailableSubscriptionAddon[];
  bundlePurchase: SubscriptionBundleSummary | null;
};

export type SubscriptionAddonOverviewResponse = { subscriptionAddons: SubscriptionAddonOverview };
export type SubscriptionAddonPurchaseResponse = { purchase: SubscriptionAddonPurchaseItem };
export type PurchaseSubscriptionAddonInput = { addonId: string };

export type SubscriptionBundleSummary = {
  id: string;
  bundleId: string;
  bundleName: string;
  status: BundlePurchase["status"];
  startsAt: string;
  endedAt: string | null;
  components: Array<{
    id: string;
    type: "subscription" | "addon";
    name: string;
    priceOverride: number | null;
    required: boolean;
    memberSubscriptionId: string | null;
    memberSubscriptionAddonId: string | null;
  }>;
};

export type PurchaseBundleInput = {
  bundleId: string;
  paymentType: "cash" | "card" | "us_bank_account";
  paymentMethodId?: string;
  startDate?: string;
  selectedOptionalComponentIds: string[];
};

export type BundlePurchaseResponse = {
  purchase: SubscriptionBundleSummary;
  subscriptionIds: string[];
  addonPurchaseIds: string[];
};

type AddonEditorBaseInput = Pick<Addon, "name" | "description" | "amount" | "currency" | "classAccessOverride"> & {
  planPriceOverrides: Array<Pick<AddonPlanPriceOverride, "sourcePlanPricingId" | "replacementPlanPricingId">>;
};

export type AddonEditorInput = AddonEditorBaseInput & (
  | {
    billingType: "one_time";
    interval: null;
    intervalThreshold: null;
  }
  | {
    billingType: "recurring";
    interval: NonNullable<Addon["interval"]>;
    intervalThreshold: number;
  }
);

type BundleComponentBaseInput = Pick<BundleComponent, "priceOverride" | "required">;

export type BundleComponentInput =
  | BundleComponentBaseInput & {
    type: "subscription";
    memberPlanPricingId: NonNullable<BundleComponent["memberPlanPricingId"]>;
  }
  | BundleComponentBaseInput & {
    type: "addon";
    addonId: NonNullable<BundleComponent["addonId"]>;
    targetMemberPlanPricingId: string;
  };

export type BundleEditorInput = Pick<Bundle, "name" | "description"> & {
  components: BundleComponentInput[];
};
