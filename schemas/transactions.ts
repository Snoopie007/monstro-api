import {
	integer,
	text,
	timestamp,
	pgTable,
	jsonb,
	boolean,
	uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberInvoices, members } from "./members";
import { paymentMethods } from "./PaymentMethods";
import { PaymentTypeEnum, TransactionStatusEnum, TransactionTypeEnum } from "./DatabaseEnums";
import type { TransactionItem, TransactionMetadata, TransactionFees } from "../types";

export const transactions = pgTable("transactions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	description: text("description"),
	items: jsonb("items").$type<TransactionItem[]>().notNull().array().default(sql`'{}'::jsonb[]`),
	type: TransactionTypeEnum("type").notNull(),
	fees: jsonb("fees").$type<TransactionFees>(),
	paymentType: PaymentTypeEnum("payment_type").notNull(),
	paymentMethodId: text("payment_method_id").references(() => paymentMethods.stripeId, { onDelete: "set null" }),
	paymentIntentId: text("payment_intent_id").unique(),
	total: integer("total").notNull().default(0),
	subTotal: integer("sub_total").notNull().default(0),
	status: TransactionStatusEnum("status").notNull().default("incomplete"),
	memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	invoiceId: text("invoice_id").unique().references(() => memberInvoices.id, { onDelete: "cascade" }),
	chargeDate: timestamp("charge_date", { withTimezone: true }).notNull().defaultNow(),
	currency: text("currency").notNull().default("USD"),
	metadata: jsonb("metadata").$type<TransactionMetadata>().notNull().default(sql`'{}'::jsonb`),
	refunded: boolean("refunded").notNull().default(false),
	refundedAmount: integer("refunded_amount").notNull().default(0),
	totalTax: integer("total_tax").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
	member: one(members, {
		fields: [transactions.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [transactions.locationId],
		references: [locations.id],
	}),
	invoice: one(memberInvoices, {
		fields: [transactions.invoiceId],
		references: [memberInvoices.id],
	}),
}));
