import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Currency } from "../types/currency";
import type { InvoiceItem } from "../types/invoices";
import { InvoiceStatusEnum, PaymentTypeEnum } from "./DatabaseEnums";
import { locations } from "./locations";
import { members } from "./members";
import { transactions } from "./transactions";

export const memberInvoices = pgTable('member_invoices', {
    id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    currency: text('currency').$type<Currency>().notNull().default('USD'),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
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
    paymentType: PaymentTypeEnum('payment_type').notNull().default('cash'),
    invoiceType: text('invoice_type').notNull().default('one-off'),
    transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
    uniqueIndex('member_invoices_transaction_id_uq')
        .on(t.transactionId)
        .where(sql`${t.transactionId} is not null`),
]);
