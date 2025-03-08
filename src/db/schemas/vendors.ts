import { integer, serial, text, timestamp, pgTable, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations, sql } from "drizzle-orm";
import { vendorProgress } from "./VendorProgress";
import { vendorReferrals } from "./VendorReferrals";
import { locations } from "./locations";

export const vendors = pgTable("vendors", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    stripeCustomerId: text("stripe_customer_id"),
    phone: text("phone_number"),
    companyName: text("company_name"),
    companyEmail: text("company_email").unique(),
    companyWebsite: text("company_website"),
    companyAddress: text("company_address"),
    icon: text("icon"),
    credits: integer("credits").notNull().default(0),
    spendedCredits: integer("spended_credits").notNull().default(0),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});



export const vendorsRelations = relations(vendors, ({ one, many }) => ({
    user: one(users, {
        fields: [vendors.userId],
        references: [users.id],
    }),
    locations: many(locations),
    vendorProgress: one(vendorProgress, {
        fields: [vendors.id],
        references: [vendorProgress.vendorId],
    }),
    referrals: many(vendorReferrals, { relationName: 'referrals' }),
    referee: one(vendorReferrals, {
        fields: [vendors.id],
        references: [vendorReferrals.referralId],
        relationName: 'referee'
    }),
}));


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

export const walletRelations = relations(wallet, ({ one }) => ({
    location: one(locations, {
        fields: [wallet.locationId],
        references: [locations.id],
    })
}));
