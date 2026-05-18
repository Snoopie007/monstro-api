import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import type { ProductSize } from "../types/product";

export const products = pgTable("products", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    subCategory: text("sub_category").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    brand: text("brand"),
    active: boolean("active").notNull().default(true),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
