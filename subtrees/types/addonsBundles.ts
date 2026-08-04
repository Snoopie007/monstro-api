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
  }>;
};

export type AddonBundlePlanPricingOption = Pick<MemberPlanPricing, "id" | "memberPlanId" | "name" | "price" | "interval" | "intervalThreshold"> & {
  planName: string;
};

export type AddonBundleCatalogOptions = {
  planPricings: AddonBundlePlanPricingOption[];
  addons: Array<Pick<AddonCatalogItem, "id" | "name" | "amount" | "currency" | "billingType" | "interval" | "intervalThreshold">>;
};

export type AddonCatalogResponse = { addons: AddonCatalogItem[]; mock: boolean };
export type AddonDetailResponse = { addon: AddonCatalogItem; mock: boolean };
export type BundleCatalogResponse = { bundles: BundleCatalogItem[]; mock: boolean };
export type BundleDetailResponse = { bundle: BundleCatalogItem; mock: boolean };
export type AddonBundleOptionsResponse = { options: AddonBundleCatalogOptions; mock: boolean };

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
  };

export type BundleEditorInput = Pick<Bundle, "name" | "description"> & {
  components: BundleComponentInput[];
};
