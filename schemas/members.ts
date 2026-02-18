import { sql } from 'drizzle-orm'
import { primaryKey, text, timestamp, pgTable, boolean, jsonb, unique, uuid } from 'drizzle-orm/pg-core'
import { locations } from './locations'
import { users } from './users'
import {
	MemberRelationshipEnum, CustomFieldTypeEnum,
	FamilyMemberStatusEnum
} from './DatabaseEnums'
import { contractTemplates } from './contracts'


export const members = pgTable('members', {
	id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
	userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
	firstName: text('first_name').notNull(),
	lastName: text('last_name'),
	email: text('email').notNull().unique(),
	phone: text('phone'),
	referralCode: text('referral_code').notNull(),
	gender: text('gender'),
	dob: timestamp('dob', { withTimezone: true, mode: 'date' }).default(sql`NULL`),
	stripeCustomerId: text('stripe_customer_id'),
	setupCompleted: boolean('setup_completed').notNull().default(false),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
})




export const memberReferrals = pgTable('member_referrals', {
	memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
	referredMemberId: text('referred_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
	locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
}, t => [
	primaryKey({ columns: [t.memberId, t.referredMemberId, t.locationId] }),
	unique('unique_referred_member_location').on(t.referredMemberId, t.locationId, t.memberId),
])



export const memberContracts = pgTable('member_contracts', {
	id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
	templateId: text('contract_id').notNull().references(() => contractTemplates.id, { onDelete: 'cascade' }),
	locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
	signature: text('signature'),
	pdfFilename: text('pdf_filename'),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
})


export const familyMembers = pgTable('family_members', {
	id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
	relatedMemberId: text('related_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
	contact: text('contact'),
	status: FamilyMemberStatusEnum('status').notNull().default('pending'),
	relationship: MemberRelationshipEnum('relationship').notNull().default('extended'),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
})

export const memberFields = pgTable('member_fields', {
	id: text('id').primaryKey().notNull().default(sql`uuid_base62()`),
	name: text('name').notNull(),
	type: CustomFieldTypeEnum('type').notNull(),
	locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
	placeholder: text('placeholder'),
	helpText: text('help_text'),
	options: jsonb('options').$type<Array<{ value: string; label: string }>>().default(sql`'[]'::jsonb`),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
})

export const memberCustomFields = pgTable('member_custom_fields', {
	memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
	customFieldId: text('custom_field_id').notNull().references(() => memberFields.id, { onDelete: 'cascade' }),
	value: text('value').notNull(),
	created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp('updated_at', { withTimezone: true }),
}, t => [
	primaryKey({ columns: [t.memberId, t.customFieldId] }),
	unique('mcf_member_field_unique').on(t.memberId, t.customFieldId),
])