
import { desc, relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb, json } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { achievements } from "./achievements";

export const rewards = pgTable("rewards", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    limitPerMember: integer("limit_per_member"),
    images: json("images"),
    requiredPoints: integer("required_points").notNull(),
    achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});