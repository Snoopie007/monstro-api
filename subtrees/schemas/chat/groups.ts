import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { users } from "../users";
import { comments } from "./comments";

export const groups = pgTable("groups", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    description: text("description"),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["public", "private"] }).notNull().default("public"),
    handle: text("handle").notNull().unique(),
    coverImage: text("cover_image"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const groupMembers = pgTable("group_members", {
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] }).default("member"),
    joined: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("idx_group_members_user_id").on(t.userId),
    index("idx_group_members_role").on(t.role),
]);

export const groupPosts = pgTable("group_posts", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('pst_')`),
    title: text("title").notNull(),
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    commentCounts: integer("comment_counts").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    content: text("content"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_group_posts_group_id").on(t.groupId),
    index("idx_group_posts_group_pinned_created").on(t.groupId, t.pinned, t.created),
]);

export const groupsRelations = relations(groups, ({ one, many }) => ({
    location: one(locations, {
        fields: [groups.locationId],
        references: [locations.id],
    }),
    groupMembers: many(groupMembers),
    posts: many(groupPosts),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
    group: one(groups, {
        fields: [groupMembers.groupId],
        references: [groups.id],
    }),
    user: one(users, {
        fields: [groupMembers.userId],
        references: [users.id],
    }),
}));

export const groupPostsRelations = relations(groupPosts, ({ one }) => ({
    group: one(groups, {
        fields: [groupPosts.groupId],
        references: [groups.id],
    }),
    author: one(users, {
        fields: [groupPosts.authorId],
        references: [users.id],
    }),
    user: one(users, {
        fields: [groupPosts.authorId],
        references: [users.id],
    }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
        relationName: "replies",
    }),
    replies: many(comments, {
        relationName: "replies",
    }),
}));
