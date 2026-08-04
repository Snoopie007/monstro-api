import { memberInvoices } from "../schemas/invoice";
import type { Location } from "./location";
import type { Member, MemberSubscription } from "./member";

export type MemberInvoice = typeof memberInvoices.$inferSelect & {
    member?: Member;
    location?: Location;
    items?: InvoiceItem[];
    memberSubscription?: MemberSubscription;
}

type InvoiceItemBase = {
    name: string;
    quantity: number;
    price: number;
    productId?: string;
    discount?: number;
    tax?: number;
}

type SubscriptionPricingSource =
    | { type: "base" }
    | { type: "addon"; memberSubscriptionAddonId: string }
    | { type: "bundle"; bundlePurchaseId: string; bundleComponentId: string };

type AddonChargePricingSource =
    | { type: "addon"; addonId: string }
    | { type: "bundle"; bundlePurchaseId: string; bundleComponentId: string };

type UnattributedInvoiceItem = InvoiceItemBase & {
    billingSource?: never;
    pricingSource?: never;
    basePlanPricingId?: never;
    effectivePlanPricingId?: never;
};

type SubscriptionInvoiceItem = InvoiceItemBase & {
    billingSource: { type: "subscription"; memberSubscriptionId: string };
    pricingSource: SubscriptionPricingSource;
    basePlanPricingId: string;
    effectivePlanPricingId: string;
};

type SubscriptionAddonInvoiceItem = InvoiceItemBase & {
    billingSource: { type: "subscription_addon"; memberSubscriptionAddonId: string };
    pricingSource: AddonChargePricingSource;
    basePlanPricingId?: never;
    effectivePlanPricingId?: never;
};

export type InvoiceItem = UnattributedInvoiceItem | SubscriptionInvoiceItem | SubscriptionAddonInvoiceItem;

export type NewInvoice = typeof memberInvoices.$inferInsert;
