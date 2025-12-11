import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, unique, integer, index } from "drizzle-orm/pg-core";
import { comments } from "./comments";
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

export const momentsRelations = relations(moments, ({ one, many }) => ({
    author: one(users, {
        fields: [moments.userId],
        references: [users.id],
    }),
    feeds: many(userFeeds),
    comments: many(comments),
    likes: many(momentLikes),
}));


export const momentLikesRelations = relations(momentLikes, ({ one }) => ({
    moment: one(moments, {
        fields: [momentLikes.momentId],
        references: [moments.id],
    }),
    user: one(users, {
        fields: [momentLikes.userId],
        references: [users.id],
    }),
}));

export const userFeedsRelations = relations(userFeeds, ({ one, many }) => ({
    author: one(users, {
        fields: [userFeeds.authorId],
        references: [users.id],
        relationName: 'authorFeeds',
    }),
    moment: one(moments, {
        fields: [userFeeds.momentId],
        references: [moments.id],
    }),
    post: one(groupPosts, {
        fields: [userFeeds.postId],
        references: [groupPosts.id],
    }),
    group: one(groups, {
        fields: [userFeeds.groupId],
        references: [groups.id],
    }),
    user: one(users, {
        fields: [userFeeds.userId],
        references: [users.id],
        relationName: 'userFeeds',
    }),
}));