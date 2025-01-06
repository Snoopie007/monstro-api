
import { relations } from "drizzle-orm";
import { integer, varchar, serial, timestamp, pgTable } from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { locations } from "./locations";
import { memberAchievements } from "./members";

export const achievements = pgTable("achievements", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    badge: varchar("badge").notNull(),
    points: integer("points").notNull(),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
});

export const actions = pgTable("actions", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
})


export const achievementsActions = {
    id: serial("id").primaryKey(),
    achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }),
    actionsId: integer("actions_id").references(() => actions.id, { onDelete: "cascade" }),
    count: integer("count").notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}

export const achievementsRelations = relations(achievements, ({ many }) => ({
    members: many(memberAchievements),
}));