import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { users } from "../users";
import { groupPosts } from "./groups";
import { moments } from "./moments";

export const comments = pgTable("comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type").notNull(),
    parentId: text("parent_id"),
    likes: integer("likes").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    depth: integer("depth").notNull().default(0),
    replyCounts: integer("reply_counts").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedOn: timestamp("deleted_on", { withTimezone: true }),
    updated: timestamp("updated_at", { withTimezone: true }),
});



export const commentsRelations = relations(comments, ({ one, many }) => ({
    post: one(groupPosts, {
        fields: [comments.ownerId],
        references: [groupPosts.id],
    }),
    moment: one(moments, {
        fields: [comments.ownerId],
        references: [moments.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
        relationName: "replies",
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),

    replies: many(comments, {
        relationName: "replies",
    }),
}));