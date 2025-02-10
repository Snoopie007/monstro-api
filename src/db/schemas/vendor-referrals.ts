import { integer, serial, timestamp, pgTable, boolean } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { relations } from "drizzle-orm";

export const vendorReferrals = pgTable("vendor_referrals", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    referralId: integer("referral_id").unique().notNull().references(() => vendors.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull().default(0),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    accepted: timestamp('accepted_at', { withTimezone: true }),
});

export const vendorReferralsRelations = relations(vendorReferrals, ({ one }) => ({
    vendor: one(vendors, {
        fields: [vendorReferrals.vendorId],
        references: [vendors.id],
        relationName: 'referrals'
    }),
    referred: one(vendors, {
        fields: [vendorReferrals.referralId],
        references: [vendors.id],
        relationName: 'referred'
    })
}));

