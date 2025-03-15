import { text, timestamp, pgTable, integer, serial, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";
import { vendorProgress } from "./VendorProgress";
import { vendorReferrals } from "./VendorReferrals";
import { locations } from "./locations";

export const vendors = pgTable("vendors", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    stripeCustomerId: text("stripe_customer_id"),
    phone: text("phone"),
    email: text("email"),
    accountOwner: boolean("account_owner").notNull().default(false),
    avatar: text("avatar"),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
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
    referrals: many(vendorReferrals, { relationName: "referrals" }),
    referee: one(vendorReferrals, {
        fields: [vendors.id],
        references: [vendorReferrals.referralId],
        relationName: "referee",
    }),
}));

export const wallet = pgTable("wallet", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    credit: integer("credit").notNull().default(0),
    rechargeAmount: integer("recharge_amount").notNull().default(20),
    rechargeThreshold: integer("recharge_threshold").notNull().default(10),
    lastCharged: timestamp("last_charged", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
});


export const walletUsage = pgTable("wallet_usage", {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id").notNull().references(() => wallet.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull().default(0),
    eventId: integer("event_id").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    rechargeThreshold: integer("recharge_threshold").notNull().default(0),
    activityDate: timestamp("activity_date").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
});

export const walletRelations = relations(wallet, ({ one }) => ({
    location: one(locations, {
        fields: [wallet.locationId],
        references: [locations.id],
    }),
}));
