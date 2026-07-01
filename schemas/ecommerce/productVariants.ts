// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, unique, index, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";
import type { ProductSize } from "../../types";

export const productVariants = pgTable("product_variants", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull().default(""),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
	sku: text("sku").notNull().unique(),
	color: text("color"),
	size: text("size").$type<ProductSize>(),
	price: integer("price").notNull().default(0),
	salePrice: integer("sale_price"),
	stock: integer("stock").notNull().default(0),
	active: boolean("active").notNull().default(true),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
	(t) => [
		index("product_variants_product_idx").on(t.productId),
		unique("product_variants_product_color_size_unique").on(t.productId, t.color, t.size),
		check("product_variants_stock_check", sql`${t.stock} >= 0`),
	],
);
