import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { members } from "../members";
import { vendors } from "../vendors";

export const groups = pgTable("groups", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('grp_')`),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: text("owner_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    coverImage: text("cover_image"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_groups_owner_id").on(t.ownerId),
]);

export const groupMembers = pgTable("group_members", {
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member"] }).default("member"),
    joined: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.groupId, t.memberId] }),
    index("idx_group_members_member_id").on(t.memberId),
    index("idx_group_members_role").on(t.role),
]);

export const groupPosts = pgTable("group_posts", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('pst_')`),
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => members.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<Array<Record<string, any>>>().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_group_posts_group_created").on(t.groupId, t.created),
    index("idx_group_posts_author_id").on(t.authorId),
]);

export const postComments = pgTable("post_comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('cmt_')`),
    postId: text("post_id").notNull().references(() => groupPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => members.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_post_comments_post_created").on(t.postId, t.created),
    index("idx_post_comments_author_id").on(t.authorId),
]);

export const groupsRelations = relations(groups, ({ one, many }) => ({
    owner: one(vendors, {
        fields: [groups.ownerId],
        references: [vendors.id],
    }),
    groupMembers: many(groupMembers),
    groupPosts: many(groupPosts),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
    group: one(groups, {
        fields: [groupMembers.groupId],
        references: [groups.id],
    }),
    member: one(members, {
        fields: [groupMembers.memberId],
        references: [members.id],
    }),
}));

export const groupPostsRelations = relations(groupPosts, ({ one, many }) => ({
    group: one(groups, {
        fields: [groupPosts.groupId],
        references: [groups.id],
    }),
    author: one(members, {
        fields: [groupPosts.authorId],
        references: [members.id],
    }),
    postComments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
    post: one(groupPosts, {
        fields: [postComments.postId],
        references: [groupPosts.id],
    }),
    author: one(members, {
        fields: [postComments.authorId],
        references: [members.id],
    }),
}));