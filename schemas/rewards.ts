import { sql } from "drizzle-orm";
import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { members } from "./members";

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


export const memberRewards = pgTable('reward_claims', {
    id: uuid('id').primaryKey().notNull().default(sql`uuid_base62()`),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    rewardId: text('reward_id').notNull().references(() => rewards.id, { onDelete: 'cascade' }),
    locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
    previousPoints: integer('previous_points'),
    dateClaimed: timestamp('date_claimed', { withTimezone: true }).notNull().defaultNow(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, t => [primaryKey({ columns: [t.id] })])