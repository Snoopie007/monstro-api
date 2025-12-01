import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { SalesStatusEnum } from "./AdminEnums";
import { adminUsers } from "./AdminUsers";
import { relations } from "drizzle-orm";

export const sales = pgTable("sales", {
    id: serial("id").primaryKey().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    locationId: text("location_id"),
    userId: integer("user_id"),
    planId: integer("plan_id").notNull(),
    coupon: text("coupon"),
    upgradeToScale: boolean("upgrade_to_scale").notNull().default(false),
    stripeCustomerId: text("stripe_customer_id"),
    agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
    closedOn: timestamp("closed_on"),
    status: SalesStatusEnum("status").notNull().default('Pending'),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});


export const salesRelations = relations(sales, ({ one, many }) => ({
    user: one(adminUsers, {
        fields: [sales.userId],
        references: [adminUsers.id],
    }),
}));

