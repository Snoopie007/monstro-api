// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { members } from "../members";
import { transactions } from "../transactions";

export const orderStatusValues = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;

export const orders = pgTable("orders", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('ord_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	status: text("status", { enum: orderStatusValues }).notNull().default("pending"),
	subtotal: integer("subtotal").notNull(),
	shipping: integer("shipping").notNull().default(0),
	tax: integer("tax").notNull().default(0),
	total: integer("total").notNull(),
	currency: text("currency").notNull().default("USD"),
	paymentIntentId: text("payment_intent_id"),
	transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
	shippingAddress: jsonb("shipping_address").$type<Record<string, unknown> | null>(),
	billingAddress: jsonb("billing_address").$type<Record<string, unknown> | null>(),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
