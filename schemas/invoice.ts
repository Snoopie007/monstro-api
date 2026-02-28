import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { InvoiceItem } from "../types/invoices";
import { InvoiceStatusEnum, PaymentTypeEnum } from "./DatabaseEnums";
import { locations } from "./locations";
import { members } from "./members";

export const memberInvoices = pgTable('member_invoices', {
    id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    currency: text('currency').notNull().default('usd'),
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
    stripeReceiptUrl: text('stripe_receipt_url'),
    status: InvoiceStatusEnum('status').notNull().default('draft'),
    paymentType: PaymentTypeEnum('payment_type').notNull().default('cash'),
    invoiceType: text('invoice_type').notNull().default('one-off'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
})