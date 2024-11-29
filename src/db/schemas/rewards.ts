
import { desc, relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { achievements } from "./achievements";

export const rewards = pgTable("rewards", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    iamge: varchar("image"),
    type: integer("type").notNull(),
    rewardPoints: integer("reward_points").notNull(),
    limitPerMember: integer("limit_per_member"),
    achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});