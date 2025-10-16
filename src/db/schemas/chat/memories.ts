import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, index, unique } from "drizzle-orm/pg-core";
import { members } from "../members";
import { locations } from "../locations";

export const memories = pgTable("memories", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mem_')`),
    title: text("title").notNull(),
    description: text("description"),
    authorId: text("author_id").references(() => members.id, { onDelete: "set null" }),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    attachments: jsonb("attachments").$type<Array<Record<string, any>>>().default(sql`'[]'::jsonb`),
    tags: text("tags").array().default(sql`'{}'`),
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_memories_author_created").on(t.authorId, t.created),
    index("idx_memories_location_created").on(t.locationId, t.created),
    index("idx_memories_is_public").on(t.isPublic),
    index("idx_memories_tags").using("gin", t.tags),
]);

export const memoryComments = pgTable("memory_comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mcm_')`),
    memoryId: text("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => members.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_memory_comments_memory_created").on(t.memoryId, t.created),
    index("idx_memory_comments_author_id").on(t.authorId),
]);

export const memoryLikes = pgTable("memory_likes", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mlk_')`),
    memoryId: text("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("unique_memory_likes_memory_member").on(t.memoryId, t.memberId),
    index("idx_memory_likes_memory_id").on(t.memoryId),
    index("idx_memory_likes_member_id").on(t.memberId),
]);

export const memoriesRelations = relations(memories, ({ one, many }) => ({
    author: one(members, {
        fields: [memories.authorId],
        references: [members.id],
    }),
    location: one(locations, {
        fields: [memories.locationId],
        references: [locations.id],
    }),
    memoryComments: many(memoryComments),
    memoryLikes: many(memoryLikes),
}));

export const memoryCommentsRelations = relations(memoryComments, ({ one }) => ({
    memory: one(memories, {
        fields: [memoryComments.memoryId],
        references: [memories.id],
    }),
    author: one(members, {
        fields: [memoryComments.authorId],
        references: [members.id],
    }),
}));

export const memoryLikesRelations = relations(memoryLikes, ({ one }) => ({
    memory: one(memories, {
        fields: [memoryLikes.memoryId],
        references: [memories.id],
    }),
    member: one(members, {
        fields: [memoryLikes.memberId],
        references: [members.id],
    }),
}));