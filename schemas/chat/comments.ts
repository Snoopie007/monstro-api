import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "../users";

export const comments = pgTable("comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type").notNull(),
    parentId: text("parent_id"),
    likes: text("likes").array().default(sql`'{}'::text[]`),
    pinned: boolean("pinned").notNull().default(false),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    depth: integer("depth").notNull().default(0),
    replyCounts: integer("reply_counts").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedOn: timestamp("deleted_on", { withTimezone: true }),
    updated: timestamp("updated_at", { withTimezone: true }),
});