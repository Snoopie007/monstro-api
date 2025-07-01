import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, integer, uuid } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberAchievements, memberPointsHistory, members } from "./members";

export const achievements = pgTable("achievements", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    title: text("title").notNull(),
    badge: text("badge").notNull(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    points: integer("points").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    description: text("description"),
    icon: text("icon"),
});

export const actions = pgTable("actions", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const achievementsActions = pgTable("achievement_actions", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    achievementId: text("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
    actionId: text("action_id").references(() => actions.id, { onDelete: "cascade" }).notNull(),
    count: integer("count").notNull(),
    metadata: text("metadata"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});



export const achievementsRelations = relations(achievements, ({ many }) => ({
    members: many(memberAchievements),
    actions: many(achievementsActions),
    pointsHistory: many(memberPointsHistory),
}));

export const achievementsActionsRelations = relations(achievementsActions, ({ one }) => ({
    achievement: one(achievements, {
        fields: [achievementsActions.achievementId],
        references: [achievements.id],
    }),
    action: one(actions, {
        fields: [achievementsActions.actionId],
        references: [actions.id],
    }),
}));
