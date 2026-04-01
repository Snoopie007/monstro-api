import {
  boolean,
  pgTable,
  timestamp,
  text,
  uuid,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { sql } from "drizzle-orm";
import { memberPlanPricing } from "./MemberPlans";
import { members } from "./members";
import { MigrateStatusEnum, PlanType } from "./DatabaseEnums";

export const migrateMembers = pgTable('migrate_members', {
  id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  acceptedOn: timestamp('accepted_at', { withTimezone: true }),
  declinedOn: timestamp('declined_at', { withTimezone: true }),
  viewedOn: timestamp('viewed_at', { withTimezone: true }),
  lastRenewalDay: timestamp('last_renewal_day', { withTimezone: true, }),
  classCredits: integer('class_credits'),
  paymentTermsLeft: integer('payment_terms_left'),
  backdateStartDate: timestamp('backdate_start_date', { withTimezone: true }),
  status: MigrateStatusEnum('status').notNull().default('pending'),
  created: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
  planType: PlanType('plan_type').notNull(),
  priceId: text('pricing_id').references(() => memberPlanPricing.id, { onDelete: 'set null' }),
  payment: boolean('payment').notNull().default(true),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  endDate: timestamp('term_end_date', { withTimezone: true }),
  metadata: jsonb('metadata').$type<{
    customFieldValues?: Array<{ fieldId: string; value: string }>
  }>().default(sql`'{}'::jsonb`),
})