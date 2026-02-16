import { sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { members } from "../members";

export const memories = pgTable("memories", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mem_')`),
    title: text("title").notNull(),
    description: text("description"),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    attachments: jsonb("attachments").$type<Array<Record<string, any>>>().default(sql`'[]'::jsonb`),
    tags: text("tags").array().default(sql`'{}'`),
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const moments = memories;
export const userFeeds = memories;

export const memoryComments = pgTable("memory_comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mcm_')`),
    memoryId: text("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const memoryLikes = pgTable("memory_likes", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mlk_')`),
    memoryId: text("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("unique_moment_likes_moment_user").on(t.momentId, t.userId),
]);
