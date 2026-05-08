// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { productVariants } from "./productVariants";

export const orderItems = pgTable("order_items", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('oit_')`),
	orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
	variantId: text("variant_id").notNull().references(() => productVariants.id),
	quantity: integer("quantity").notNull(),
	unitPrice: integer("unit_price").notNull(),
	productSnapshot: jsonb("product_snapshot").$type<Record<string, unknown>>().notNull(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	check("order_items_quantity_positive", sql`${t.quantity} > 0`),
	check("order_items_unit_price_nonnegative", sql`${t.unitPrice} >= 0`),
]);
