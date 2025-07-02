import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, integer, uuid } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberAchievements, memberPointsHistory, members } from "./members";

export const achievements = pgTable("achievements", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    description: text("description").notNull(),
    badge: text("badge").notNull(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    requiredActionCount: integer("required_action_count").notNull(),
    points: integer("points").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});


export const achievementTriggers = pgTable("achievement_triggers", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    achievementId: text("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
    type: text("type").notNull(),
    weight: integer("weight").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});



export const achievementsRelations = relations(achievements, ({ many }) => ({
    members: many(memberAchievements),
    triggers: many(achievementTriggers),
    pointsHistory: many(memberPointsHistory),
}));

export const achievementTriggersRelations = relations(achievementTriggers, ({ one }) => ({
    achievement: one(achievements, {
        fields: [achievementTriggers.achievementId],
        references: [achievements.id],
    })
}));
