import { pgTable, text, integer, jsonb, timestamp, primaryKey, boolean } from 'drizzle-orm/pg-core'

import { members } from './members'
import { locations, memberLocations } from './locations'
import { relations, sql } from 'drizzle-orm'
import { CardPaymentMethod, UsBankAccountPaymentMethod, PaymentType } from '@/types'


export const memberPaymentMethods = pgTable('member_payment_methods', {
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    type: text('type').$type<PaymentType>().notNull(),
    stripeId: text('stripe_id').notNull(),
    fingerprint: text('fingerprint').notNull().unique(),
    isDefault: boolean('is_default').notNull().default(false),
    card: jsonb('card').$type<CardPaymentMethod>(),
    usBankAccount: jsonb('us_bank_account').$type<UsBankAccountPaymentMethod>(),
    last4: text('last4').notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, t => [primaryKey({ columns: [t.memberId, t.locationId] })])



export const memberPaymentMethodsRelations = relations(memberPaymentMethods, ({ one }) => ({
    member: one(members, {
        fields: [memberPaymentMethods.memberId],
        references: [members.id],
    }),
    location: one(locations, {
        fields: [memberPaymentMethods.locationId],
        references: [locations.id],
    }),
    memberLocation: one(memberLocations, {
        fields: [memberPaymentMethods.memberId, memberPaymentMethods.locationId],
        references: [memberLocations.memberId, memberLocations.locationId],
        relationName: 'memberPaymentMethods',
    }),
}));