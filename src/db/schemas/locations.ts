

import { relations, sql } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { memberInvoices, members } from "./members";
import { integrations } from "./intergrations";
import { programs } from "./programs";
import { transactions } from "./transactions";
import { vendors } from "./vendors";
import { memberSubscriptions } from "./MemberPlans";
import { LocationSettings, MemberOnboarding } from "@/types";

const LocationStatusEnum = pgEnum("location_status", ["incomplete", "active", "inactive", "past_due", "canceled", "archived", "paused", "trailing"])
const MemberLocationStatusEnum = pgEnum("member_location_status", ["incomplete", "active", "inactive", "archived", "canceled", "paused"])

export const locations = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    email: text("email"),
    industry: text("industry").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    website: text("website"),
    country: text("country"),
    phone: text("phone"),
    timezone: text("timezone"),
    logoUrl: text("logo_url"),
    metadata: jsonb("meta_data").$type<Record<string, any>>(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const locationState = pgTable("location_state", {
    locationId: integer("location_id").primaryKey().references(() => locations.id, { onDelete: "cascade" }),
    planId: integer("plan_id"),
    pkgId: integer("pkg_id"),
    paymentPlanId: integer("payment_plan_id"),
    agreeToTerms: boolean("agree_to_terms").notNull().default(false),
    lastRenewalDate: timestamp('last_renewal_date', { withTimezone: true }),
    startDate: timestamp('start_date', { withTimezone: true }),
    settings: jsonb("settings").$type<LocationSettings>().notNull().default(sql`'{}'::jsonb`),
    usagePercent: integer("usage_percent").notNull().default(0),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});


export const memberLocations = pgTable("member_locations", {
    memberId: integer("member_id").notNull().references(() => members.id),
    locationId: integer("location_id").notNull().references(() => locations.id),
    stripeCustomerId: text("stripe_customer_id"),
    status: MemberLocationStatusEnum("status").notNull().default("incomplete"),
    progress: jsonb("progress").$type<MemberOnboarding>().notNull().default(sql`'{}'::jsonb`),
    inviteDate: timestamp('invite_date', { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.memberId, t.locationId] })]);

export const wallet = pgTable("wallet", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    credit: integer("credit").notNull().default(0),
    rechargeAmount: integer("recharge_amount").notNull().default(20),
    rechargeThreshold: integer("recharge_threshold").notNull().default(10),
    lastCharged: timestamp('last_charged', { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const locationsRelations = relations(locations, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    integrations: many(integrations),
    programs: many(programs),
    memberSubscriptions: many(memberSubscriptions),
    memberInvoices: many(memberInvoices),
    locationState: one(locationState, {
        fields: [locations.id],
        references: [locationState.locationId],
    }),
    vendor: one(vendors, {
        fields: [locations.vendorId],
        references: [vendors.id],
    }),
    wallet: one(wallet, {
        fields: [locations.id],
        references: [wallet.locationId],
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

export const walletRelations = relations(wallet, ({ one }) => ({
    location: one(locations, {
        fields: [wallet.locationId],
        references: [locations.id],
    })
}));
