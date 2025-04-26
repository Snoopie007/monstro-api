import { text, timestamp, pgTable, integer, serial, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";
import { vendorLevels } from "./VendorProgress";
import { vendorReferrals } from "./VendorReferrals";
import { locations } from "./locations";

export const vendors = pgTable("vendors", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    stripeCustomerId: text("stripe_customer_id"),
    phone: text("phone"),
    email: text("email"),
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
    vendorLevel: one(vendorLevels, {
        fields: [vendors.id],
        references: [vendorLevels.vendorId],
    }),
    referrals: many(vendorReferrals, { relationName: "referrals" }),
    referee: one(vendorReferrals, {
        fields: [vendors.id],
        references: [vendorReferrals.referralId],
        relationName: "referee",
    }),
}));
