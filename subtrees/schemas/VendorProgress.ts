import { serial, integer, timestamp, pgTable, boolean, text, jsonb, uuid } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { relations, sql } from "drizzle-orm";

// Vendor Progress
export const vendorLevels = pgTable("vendor_levels", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

// Vendor Badges
export const vendorBadges = pgTable("vendor_badges", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    vendorLevelId: text("vendor_level_id").notNull().references(() => vendorLevels.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id").notNull(),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    claimed: timestamp("claimed_at", { withTimezone: true }),
});

// Vendor Rewards
export const vendorRewards = pgTable("vendor_rewards", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    description: text("description").notNull(),
    images: text("images").notNull(), // Matches "images" in SQL
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    requiredPoints: integer("required_points").notNull(),
    created: timestamp("created_at", { withTimezone: true }),
    updated: timestamp("updated_at", { withTimezone: true }),
});

// Vendor Claimed Rewards
export const vendorClaimedRewards = pgTable("vendor_claimed_rewards", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    vendorLevelId: text("vendor_level_id").notNull().references(() => vendorLevels.id, { onDelete: "cascade" }),
    rewardId: text("reward_id").notNull().references(() => vendorRewards.id, { onDelete: "cascade" }),
    claimed: timestamp("claimed_at", { withTimezone: true }).notNull(),
});

// Relationships
export const vendorLevelsRelations = relations(vendorLevels, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorLevels.vendorId],
        references: [vendors.id],
    }),
    badges: many(vendorBadges),
    claimedRewards: many(vendorClaimedRewards),
}));

export const vendorBadgesRelations = relations(vendorBadges, ({ one }) => ({
    vendorLevel: one(vendorLevels, {
        fields: [vendorBadges.vendorLevelId],
        references: [vendorLevels.id],
    }),
}));

export const vendorClaimedRewardsRelations = relations(vendorClaimedRewards, ({ one }) => ({
    vendorLevel: one(vendorLevels, {
        fields: [vendorClaimedRewards.vendorLevelId],
        references: [vendorLevels.id],
    }),
    reward: one(vendorRewards, {
        fields: [vendorClaimedRewards.rewardId],
        references: [vendorRewards.id],
    }),
}));
