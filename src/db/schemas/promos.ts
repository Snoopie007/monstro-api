import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { PromoDurationEnum, PromoTypeEnum } from "./DatabaseEnums";
import { locations } from "./locations";

export const promos = pgTable("promos", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  stripeCouponId: text("stripe_coupon_id"),
  stripePromoId: text("stripe_promo_id"),
  code: text("code").notNull(),
  type: PromoTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  duration: PromoDurationEnum("duration").notNull(),
  durationInMonths: integer("duration_in_months"),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
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

export type Promo = typeof promos.$inferSelect;
