// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

export const productImages = pgTable("product_images", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
	imageUrl: text("image_url").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});