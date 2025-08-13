import { text, integer, timestamp, pgTable, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { memberRewards } from "./members";
import { relations, sql } from "drizzle-orm";

export const rewards = pgTable("rewards", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    description: text("description").notNull(),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    requiredPoints: integer("required_points").notNull(),
    limitPerMember: integer("limit_per_member").notNull(),
    totalLimit: text("limit_total").notNull().default("unlimited"),
    images: text("images").array().notNull(), // No default array (set in app logic)
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const rewardRelations = relations(rewards, ({ many }) => ({
    claims: many(memberRewards),
}));
