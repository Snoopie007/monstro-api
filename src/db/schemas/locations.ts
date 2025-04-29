import { relations, sql } from "drizzle-orm";
import { boolean, primaryKey, serial, text, timestamp, pgTable, jsonb, integer } from "drizzle-orm/pg-core";
import { memberInvoices, members } from "./members";
import { integrations } from "./integrations";
import { programs } from "./programs";
import { transactions } from "./transactions";
import { vendors } from "./vendors";
import { memberPlans, memberSubscriptions } from "./MemberPlans";
import { LocationStatusEnum } from "./DatabaseEnums";
import { IncompletePlan, LocationSettings } from "@/types";
import { aiBots } from "./ai";


export const locations = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    legalName: text("legal_name"),
    email: text("email"),
    industry: text("industry"),
    address: text("address").unique(),
    city: text("city"),
    state: LocationStatusEnum("state"),
    postalCode: text("postal_code"),
    website: text("website"),
    country: text("country"),
    phone: text("phone"),
    timezone: text("timezone"),
    logoUrl: text("logo_url"),
    slug: text("slug").unique().notNull(),
    metadata: jsonb("meta_data"),
    about: text("about"),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
});

export const locationState = pgTable("location_state", {
    locationId: integer("location_id").primaryKey().references(() => locations.id, { onDelete: "cascade" }),
    planId: integer("plan_id"),
    pkgId: integer("pkg_id"),
    paymentPlanId: integer("payment_plan_id"),
    waiverId: integer("waiver_id").references(() => locations.id, { onDelete: "set null" }),
    agreeToTerms: boolean("agree_to_terms").notNull().default(false),
    lastRenewalDate: timestamp("last_renewal_date", { withTimezone: true }).defaultNow(),
    startDate: timestamp("start_date", { withTimezone: true }),
    settings: jsonb("settings").$type<LocationSettings>().notNull().default(sql`'{}'::jsonb`),
    usagePercent: integer("usage_percent").notNull().default(0),
    taxRate: integer("tax_rate").notNull().default(0),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});


export const wallets = pgTable("wallets", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    credits: integer("credits").notNull().default(0),
    rechargeAmount: integer("recharge_amount").notNull().default(2500),
    rechargeThreshold: integer("recharge_threshold").notNull().default(1000),
    lastCharged: timestamp("last_charged", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});


export const walletUsages = pgTable("wallet_usages", {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    isCredit: boolean("is_credit").notNull().default(false),
    activityDate: timestamp("activity_date").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const memberLocations = pgTable("member_locations", {
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    incompletePlan: jsonb("incomplete_plan").$type<IncompletePlan>(),
    inviteDate: timestamp("invite_date", { withTimezone: true }),
    inviteAcceptedDate: timestamp("invite_accepted_date", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: false }),
    waiverId: integer("waiver_id").references(() => locations.id, { onDelete: "set null" }),
}, (t) => [primaryKey({ columns: [t.memberId, t.locationId] })]);


export const locationsRelations = relations(locations, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    integrations: many(integrations),
    programs: many(programs),
    memberPlans: many(memberPlans),
    memberSubscriptions: many(memberSubscriptions),
    memberInvoices: many(memberInvoices),
    bots: many(aiBots),
    locationState: one(locationState, {
        fields: [locations.id],
        references: [locationState.locationId],
    }),
    vendor: one(vendors, {
        fields: [locations.vendorId],
        references: [vendors.id],
    }),
    wallet: one(wallets, {
        fields: [locations.id],
        references: [wallets.locationId],
    })
}));


export const locationStateRelations = relations(locationState, ({ one }) => ({
    location: one(locations, {
        fields: [locationState.locationId],
        references: [locations.id],
    }),
}));


export const memberLocationsRelations = relations(memberLocations, ({ one, many }) => ({
    member: one(members, {
        fields: [memberLocations.memberId],
        references: [members.id],
    }),
    location: one(locations, {
        fields: [memberLocations.locationId],
        references: [locations.id],
    }),
    transactions: many(transactions),
}));


export const walletRelations = relations(wallets, ({ one, many }) => ({
    location: one(locations, {
        fields: [wallets.locationId],
        references: [locations.id],
    }),
    usages: many(walletUsages, { relationName: "usages" }),
}));
