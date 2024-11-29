
import { integer, varchar, serial, timestamp, pgTable } from "drizzle-orm/pg-core";

import { programs } from "./programs";

export const achievements = pgTable("achievements", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    image: varchar("image").notNull(),
    badge: varchar("badge").notNull(),
    reward_points: integer("reward_points").notNull(),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
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