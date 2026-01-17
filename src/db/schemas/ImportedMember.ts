import {
  boolean,
  pgTable,
  timestamp,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberPlanPricing } from "./MemberPlans";
import { members } from "./members";
import { ImportedMemberStatusEnum, PlanType } from "./DatabaseEnums";

export const importMembers = pgTable('import_members', {
  id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  memberId: text('member_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  lastRenewalDay: timestamp('last_renewal_day', {
    withTimezone: true,
  }).notNull(),
  status: ImportedMemberStatusEnum('status').notNull().default('pending'),
  created: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
  planType: PlanType('plan_type').notNull(),
  priceId: text('pricing_id').references(() => memberPlanPricing.id, { onDelete: 'set null' }),
  oauth: boolean('oauth').notNull().default(false),
  payment: boolean('payment').notNull().default(true),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
})

export const importedMembersRelations = relations(importMembers, ({ one }) => ({
  location: one(locations, {
    fields: [importMembers.locationId],
    references: [locations.id],
  }),
  member: one(members, {
    fields: [importMembers.memberId],
    references: [members.id],
  }),
  pricing: one(memberPlanPricing, {
    fields: [importMembers.priceId],
    references: [memberPlanPricing.id],
  })
}));