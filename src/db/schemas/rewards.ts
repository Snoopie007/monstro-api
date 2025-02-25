import { integer, varchar, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const rewards = pgTable("rewards", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    limitPerMember: integer("limit_per_member").notNull().default(0),
    totalLimit: integer("limit_total").notNull().default(0),
    images: text("images").array().notNull().default([]),
    requiredPoints: integer("required_points").notNull(),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});