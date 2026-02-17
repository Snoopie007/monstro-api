import { pgTable, text, jsonb, timestamp, primaryKey, boolean, unique } from 'drizzle-orm/pg-core'

import { members } from './members'
import { locations } from './locations'
import { sql } from 'drizzle-orm'
import type { CardPaymentMethod, UsBankAccountPaymentMethod, PaymentType } from '../types'


export const paymentMethods = pgTable('payment_methods', {
    id: text('id').primaryKey().notNull().default(sql`uuid_base62()`),
    type: text('type').$type<PaymentType>().notNull(),
    stripeId: text('stripe_id').notNull().unique(),
    fingerprint: text('fingerprint').notNull(), // Remove .unique()
    card: jsonb('card').$type<CardPaymentMethod>(),
    usBankAccount: jsonb('us_bank_account').$type<UsBankAccountPaymentMethod>(),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, t => [
    unique('stripe_id_unique').on(t.stripeId),
    unique('fingerprint_member_unique').on(t.fingerprint, t.memberId) // Composite unique constraint
])

export const memberPaymentMethods = pgTable('member_payment_methods', {

    paymentMethodId: text('payment_method_id').references(() => paymentMethods.id, { onDelete: 'cascade' }).notNull(),
    memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }).notNull(),
    locationId: text('location_id').references(() => locations.id, { onDelete: 'cascade' }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
}, t => [primaryKey({ columns: [t.locationId, t.memberId, t.paymentMethodId] })])