import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberPlans } from "./MemberPlans";
import { members } from "./members";

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  badge: text("badge").notNull(),
  locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
  requiredActionCount: integer("required_action_count").notNull(),
  planId: text("plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  triggerId: integer("trigger_id").notNull(),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberAchievements = pgTable('member_achievements', {
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  progress: integer('progress').default(0),
  dateAchieved: timestamp('date_achieved', { withTimezone: true }),
  created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.memberId, t.achievementId] })])

export const memberPointsHistory = pgTable('member_points_history', {
  id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  points: bigint('points', { mode: 'number' }).notNull().default(0),
  achievementId: text('achievement_id').references(() => achievements.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  removed: boolean('removed').notNull().default(false),
  removedReason: text('removed_reason'),
  removedOn: timestamp('removed_on', { withTimezone: true }),
  created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
})