import type { MonstroPlansBenefits } from "@/types/admin";
import { integer, serial, text, timestamp, pgTable, jsonb, boolean } from "drizzle-orm/pg-core";
export const monstroPlans = pgTable('monstro_plans', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    usagePercent: integer('usage_percent').notNull(),
    threshold: integer('threshold').notNull(),
    interval: text('interval').notNull(),
    benefits: text('benefits').array(),
    description: text('description').notNull(),
    priceId: text('price_id'),
    testPriceId: text('test_price_id'),
    coupon: text('coupon'),
    created: timestamp('created_at').notNull().defaultNow(),
    updated: timestamp('updated_at'),
});


