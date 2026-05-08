// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { products } from "./products";

export const productVariants = pgTable("product_variants", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('var_')`),
	productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
	sku: text("sku").notNull(),
	color: text("color"),
	size: text("size"),
	price: integer("price").notNull(),
	stock: integer("stock").notNull().default(0),
	active: boolean("active").notNull().default(true),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("product_variants_product_sku_unique").on(t.productId, t.sku),
	unique("product_variants_product_color_size_unique").on(t.productId, t.color, t.size),
	check("product_variants_price_nonnegative", sql`${t.price} >= 0`),
	check("product_variants_stock_nonnegative", sql`${t.stock} >= 0`),
]);
