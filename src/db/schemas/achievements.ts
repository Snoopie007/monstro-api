import { relations, sql } from "drizzle-orm";
import {
  text,
  timestamp,
  pgTable,
  integer,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { memberPointsHistory, members } from "./members";
import { memberPlans } from "./MemberPlans";

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  badge: text("badge").notNull(),
  points: integer("points").notNull(),
  requiredActionCount: integer("required_action_count").notNull(),
  locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
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

export const achievementTriggers = pgTable("achievement_triggers", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  name: text("name").notNull().unique(),
});

export const triggeredAchievements = pgTable("triggered_achievements", {
  achievementId: text("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
  triggerId: text("trigger_id").references(() => achievementTriggers.id, { onDelete: "cascade" }).notNull(),
  weight: integer("weight").notNull(),
  timePeriod: integer("time_period"),
  timePeriodUnit: text("time_period_unit", { enum: ["day", "week", "month", "year"] }),
  memberPlanId: text("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.achievementId, table.triggerId] })]);

export const achievementsRelations = relations(achievements, ({ many, one }) => ({
  members: many(memberAchievements),
  pointsHistory: many(memberPointsHistory),
  memberAchievements: many(memberAchievements),
}));

export const triggeredAchievementsRelations = relations(triggeredAchievements, ({ one }) => ({
  achievement: one(achievements, {
    fields: [triggeredAchievements.achievementId],
    references: [achievements.id],
  }),
  trigger: one(achievementTriggers, {
    fields: [triggeredAchievements.triggerId],
    references: [achievementTriggers.id],
  }),
}));

export const achievementTriggersRelations = relations(achievementTriggers, ({ many }) => ({
  triggeredAchievements: many(triggeredAchievements),
}));

export const memberAchievementsRelations = relations(memberAchievements, ({ one }) => ({
  member: one(members, {
    fields: [memberAchievements.memberId],
    references: [members.id],
  }),
  location: one(locations, {
    fields: [memberAchievements.locationId],
    references: [locations.id],
  }),
  achievement: one(achievements, {
    fields: [memberAchievements.achievementId],
    references: [achievements.id],
  }),
}));