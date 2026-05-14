import { sql } from "drizzle-orm";
import {
    check,
    index,
    integer,
    jsonb,
    pgTable,
    boolean,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import type { Address } from "../types/other";
import { members } from "./members";
import { productVariants } from "./products";

export const orders = pgTable("orders", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    memberId: uuid("member_id").references(() => members.id),
    isGuest: boolean("is_guest").notNull().default(false),
    status: text("status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    shipping: integer("shipping").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("usd"),
    stripePaymentIntent: text("stripe_payment_intent"),
    shippingAddress: jsonb("shipping_address").$type<Address>(),
    billingAddress: jsonb("billing_address").$type<Address>(),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
},
    (t) => [
        index("orders_member_idx").on(t.memberId),
        index("orders_status_idx").on(t.status),
        check(
            "orders_status_check",
            sql`${t.status} in ('pending','paid','shipped','delivered','cancelled','refunded')`,
        ),
    ],
);

export const orderItems = pgTable("order_items", {
    id: uuid("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    productSnapshot: jsonb("product_snapshot").notNull(),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
},
    (t) => [
        index("order_items_order_idx").on(t.orderId),
        check("order_items_quantity_check", sql`${t.quantity} > 0`),
    ],
);
