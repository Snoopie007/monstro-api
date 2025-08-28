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
import { memberAchievements, memberPointsHistory } from "./members";
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
  triggedAchievement: one(triggeredAchievements, {
    fields: [achievements.id],
    references: [triggeredAchievements.achievementId],
  }),
  pointsHistory: many(memberPointsHistory),
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
