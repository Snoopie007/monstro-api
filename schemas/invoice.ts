import {
  boolean,
  foreignKey,
  pgTable,
  timestamp,
  text,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { sql } from "drizzle-orm";
import { members } from "./members";
import { InvoiceStatusEnum } from "./DatabaseEnums";
import type { InvoiceItem } from "../types/invoices";
import { transactions } from "./transactions";

const paymentTypeValues = ["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay"] as const;

export const memberInvoices = pgTable('member_invoices', {
    id: text('id').primaryKey().notNull().default(sql`uuid_base62('inv_')`),
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    currency: text('currency').default('USD'),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id'),
    memberPlanId: text('member_plan_id'),
    description: text('description'),
    items: jsonb('items').array().$type<InvoiceItem[]>().default(sql`'{}'::jsonb[]`),
    paid: boolean('paid').notNull().default(false),
    tax: integer('tax').notNull().default(0),
    total: integer('total').notNull().default(0),
    subTotal: integer('subtotal').notNull().default(0),
    forPeriodStart: timestamp('for_period_start', { withTimezone: true }),
    forPeriodEnd: timestamp('for_period_end', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull().defaultNow(),
    attemptCount: integer('attempt_count').notNull().default(0),
    invoicePdf: text('invoice_pdf'),
    receiptUrl: text('receipt_url'),
    status: InvoiceStatusEnum('status').notNull().default('draft'),
    paymentType: text('payment_type', { enum: paymentTypeValues }).notNull().default('cash'),
    invoiceType: text('invoice_type').notNull().default('one-off'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    foreignKey({
      name: 'member_invoices_transaction_id_fkey',
      columns: [t.transactionId],
      foreignColumns: [transactions.id],
    }).onDelete('set null'),
    uniqueIndex('member_invoices_transaction_id_uq')
      .on(t.transactionId)
      .where(sql`${t.transactionId} is not null`),
]);
