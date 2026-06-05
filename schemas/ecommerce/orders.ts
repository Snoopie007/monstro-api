import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import type { Address } from "../../types/other";
import { members } from "../members";
import type { OrderLineItem } from "../../types/product";
import { locations } from "../locations";

export const orders = pgTable("orders", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").references(() => members.id),
	locationId: text("location_id").notNull().references(() => locations.id),
	trackingNumber: integer("tracking_number").notNull(),
	status: text("status").notNull().default("pending"),
	subtotal: integer("subtotal").notNull(),
	shipping: integer("shipping").notNull().default(0),
	tax: integer("tax").notNull().default(0),
	total: integer("total").notNull(),
	items: jsonb("items").$type<OrderLineItem[]>().notNull().default(sql`'[]'::jsonb`),
	gatewayPaymentId: text("gateway_payment_id"),
	processingFee: integer("processing_fee").notNull().default(0),
	shippingAddress: jsonb("shipping_address").$type<Address>(),
	billingAddress: jsonb("billing_address").$type<Address>(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
	(t) => [
		index("orders_member_idx").on(t.memberId),
		index("orders_status_idx").on(t.status),
		index("orders_tracking_number_idx").on(t.trackingNumber),
		check(
			"orders_status_check",
			sql`${t.status} in ('pending','paid','shipped','delivered','cancelled','refunded')`,
		),
	],
);

