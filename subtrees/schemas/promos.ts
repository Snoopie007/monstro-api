import { pgTable, text, timestamp, integer, boolean, unique } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { locations } from "./locations";
import { PromoTypeEnum, PromoDurationEnum } from "./DatabaseEnums";

export const promos = pgTable("promos", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    stripeCouponId: text("stripe_coupon_id"),
    stripePromoId: text("stripe_promo_id"),
    code: text("code").notNull(),
    type: PromoTypeEnum("type").notNull(),
    value: integer("value").notNull(),
    duration: PromoDurationEnum("duration").notNull(),
    durationInMonths: integer("duration_in_months"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    maxRedemptions: integer("max_redemptions"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    allowedPlans: text("allowed_plans").array(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    unique("promos_location_code_unique").on(t.locationId, t.code),
]);

export const promosRelations = relations(promos, ({ one }) => ({
    location: one(locations, {
        fields: [promos.locationId],
        references: [locations.id],
    }),
}));