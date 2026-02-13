import { sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, unique, integer, index } from "drizzle-orm/pg-core";
import { users } from "../users";
import { groupPosts, groups } from "./groups";

export const moments = pgTable("moments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    commentCounts: integer("comment_counts").notNull().default(0),
    likeCounts: integer("like_counts").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});


export const userFeeds = pgTable("user_feeds", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    momentId: text("moment_id").references(() => moments.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => groupPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
}, (t) => [
    // Prevent duplicates: same user can't see same item twice
    unique("unique_user_feed_item").on(t.userId, t.momentId, t.postId),
    // Performance indexes
    index("idx_user_feeds_user_created").on(t.userId, t.created),
    index("idx_user_feeds_author").on(t.authorId),
    index("idx_user_feeds_moment").on(t.momentId),
    index("idx_user_feeds_post").on(t.postId),
    index("idx_user_feeds_group").on(t.groupId),
]);



export const momentLikes = pgTable("moment_likes", {
    momentId: text("moment_id").notNull().references(() => moments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("unique_moment_likes_moment_user").on(t.momentId, t.userId),
]);