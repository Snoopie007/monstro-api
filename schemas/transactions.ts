import {
    integer,
    text,
    timestamp,
    pgTable,
    jsonb,
    boolean,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { sql } from "drizzle-orm";
import { members } from "./members";
import { TransactionTypeEnum } from "./DatabaseEnums";
import type { TransactionActivity, TransactionMetadata } from "../types";
import type { InvoiceItem } from "../types/invoices";

const paymentTypeValues = ["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay"] as const;
const transactionStatusValues = ["pending", "paid", "failed", "disputed"] as const;

export const transactions = pgTable("transactions", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('txn_')`),
	description: text("description"),
	items: jsonb("items").$type<InvoiceItem[]>().notNull().array().default(sql`'{}'::jsonb[]`),
	type: TransactionTypeEnum("type").notNull(),
	feeAmount: integer("fee_amount").notNull().default(0),
	paymentType: text("payment_type", { enum: paymentTypeValues }).notNull().default("card"),
    paymentMethodId: text("payment_method_id"),
	paymentIntentId: text("payment_intent_id").unique(),
	total: integer("total").notNull().default(0),
	subTotal: integer("sub_total").notNull().default(0),
	disputeReason: text("dispute_reason"),
	failedReason: text("failed_reason"),
	failedCode: text("failed_code"),
	status: text("status", { enum: transactionStatusValues }).notNull().default("failed"),
	memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	chargeDate: timestamp("charge_date", { withTimezone: true }).defaultNow(),
	currency: text("currency").notNull().default("USD"),
	metadata: jsonb("metadata").$type<TransactionMetadata>().notNull().default(sql`'{}'::jsonb`),
	activities: jsonb("activities").$type<TransactionActivity[]>().notNull().default(sql`'[]'::jsonb`),
	refunded: boolean("refunded").notNull().default(false),
	refundedAmount: integer("refunded_amount").notNull().default(0),
	tax: integer("total_tax").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
