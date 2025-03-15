import { serial, integer, timestamp, pgTable, boolean, text, jsonb } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";

// Vendor Progress
export const vendorProgress = pgTable("vendor_progress", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

// Vendor Badges
export const vendorBadges = pgTable("vendor_badges", {
    id: serial("id").primaryKey(),
    vendorProgressId: integer("vendor_progress_id").notNull().references(() => vendorProgress.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id").notNull(),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    claimed: timestamp("claimed_at", { withTimezone: true }),
});

// Vendor Rewards
export const vendorRewards = pgTable("vendor_rewards", {
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
    vendorProgressId: integer("vendor_progress_id").notNull().references(() => vendorProgress.id, { onDelete: "cascade" }),
    rewardId: integer("reward_id").notNull().references(() => vendorRewards.id, { onDelete: "cascade" }),
    claimed: timestamp("claimed_at", { withTimezone: true }).notNull(),
});

// Relationships
export const vendorProgressRelations = relations(vendorProgress, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorProgress.vendorId],
        references: [vendors.id],
    }),
    badges: many(vendorBadges),
    claimedRewards: many(vendorClaimedRewards),
}));

export const vendorBadgesRelations = relations(vendorBadges, ({ one }) => ({
    vendorProgress: one(vendorProgress, {
        fields: [vendorBadges.vendorProgressId],
        references: [vendorProgress.id],
    }),
}));

export const vendorClaimedRewardsRelations = relations(vendorClaimedRewards, ({ one }) => ({
    vendorProgress: one(vendorProgress, {
        fields: [vendorClaimedRewards.vendorProgressId],
        references: [vendorProgress.id],
    }),
    reward: one(vendorRewards, {
        fields: [vendorClaimedRewards.rewardId],
        references: [vendorRewards.id],
    }),
}));
