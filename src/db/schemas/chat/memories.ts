import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { members } from "../members";
import { comments } from "./groups";

export const memories = pgTable("memories", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mem_')`),
    title: text("title").notNull(),
    description: text("description"),
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    tags: text("tags").array().default(sql`'{}'`),
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});



export const memoryLikes = pgTable("memory_likes", {
    memoryId: text("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("unique_memory_likes_memory_member").on(t.memoryId, t.memberId),
]);

export const memoriesRelations = relations(memories, ({ one, many }) => ({
    member: one(members, {
        fields: [memories.memberId],
        references: [members.id],
    }),
    comments: many(comments),
    memoryLikes: many(memoryLikes),
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