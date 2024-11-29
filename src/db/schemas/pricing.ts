

import { integer, serial, text, timestamp, pgTable, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { plans } from "./plans";

export const pricings = pgTable("stripe_plan_pricings", {
    id: serial("id").primaryKey(),
    amount: doublePrecision("amount").notNull(),
    billingPeriod: text("billing_period"),
    stripePriceId: text("stripe_price_id").notNull(),
    stripePlanId: integer("stripe_plan_id").references(() => plans.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const pricingRelations = relations(pricings, ({ one }) => ({
    plans: one(plans, {
        fields: [pricings.stripePlanId],
        references: [plans.id],
    }),
}))