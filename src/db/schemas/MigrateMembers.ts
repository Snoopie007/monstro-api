import { boolean, pgTable, timestamp, text, uuid, jsonb } from 'drizzle-orm/pg-core'
import { locations } from './locations'
import { relations, sql } from 'drizzle-orm'
import { memberPlanPricing } from './MemberPlans'
import { members } from './members'
import { MigrateStatusEnum, PlanType } from './DatabaseEnums'

export const migrateMembers = pgTable('migrate_members', {
    id: uuid('id')
        .primaryKey()
        .notNull()
        .default(sql`uuid_base62()`),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    memberId: text('member_id').references(() => members.id, {
        onDelete: 'set null',
    }),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    acceptedOn: timestamp('accepted_at', { withTimezone: true }),
    declinedOn: timestamp('declined_at', { withTimezone: true }),
    viewedOn: timestamp('viewed_at', { withTimezone: true }),
    lastRenewalDay: timestamp('last_renewal_day', {
        withTimezone: true,
    }).notNull(),
    status: MigrateStatusEnum('status').notNull().default('pending'),
    created: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    pricingId: text('pricing_id').references(() => memberPlanPricing.id, {
        onDelete: 'set null',
    }),
    planType: PlanType('plan_type'),
    payment: boolean('payment').notNull().default(true),
    metadata: jsonb('metadata')
        .$type<{
            customFieldValues?: Array<{ fieldId: string; value: string }>
        }>()
        .default(sql`'{}'::jsonb`),
    locationId: text('location_id')
        .notNull()
        .references(() => locations.id, { onDelete: 'cascade' }),
})

export const migrateRelations = relations(migrateMembers, ({ one }) => ({
    location: one(locations, {
        fields: [migrateMembers.locationId],
        references: [locations.id],
    }),
    member: one(members, {
        fields: [migrateMembers.memberId],
        references: [members.id],
    }),
    pricing: one(memberPlanPricing, {
        fields: [migrateMembers.pricingId],
        references: [memberPlanPricing.id],
    })
}));
