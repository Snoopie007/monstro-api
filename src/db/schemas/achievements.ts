import { relations } from "drizzle-orm";
import { bigint, text, serial, timestamp, pgTable, integer } from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { locations } from "./locations";
import { memberAchievements } from "./members";

export const achievements = pgTable("achievements", {
    id: serial("id").primaryKey(),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    badge: text("badge").notNull(),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    points: integer("points").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    description: text("description"),
    icon: text("icon"),
});

export const actions = pgTable("actions", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const achievementsActions = pgTable("achievement_actions", {
    id: serial("id").primaryKey(),
    achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
    actionId: integer("action_id").references(() => actions.id, { onDelete: "cascade" }).notNull(),
    count: integer("count").notNull(),
    metadata: text("metadata"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const achievementsRelations = relations(achievements, ({ many }) => ({
    members: many(memberAchievements),
    actions: many(achievementsActions),
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
