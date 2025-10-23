import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { users } from "../users";

export const groups = pgTable("groups", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('grp_')`),
    name: text("name").notNull(),
    description: text("description"),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    icon: text("icon"),
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
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pinned: boolean("pinned").notNull().default(false),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<Array<Record<string, any>>>().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const postComments = pgTable("post_comments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('cmt_')`),
    postId: text("post_id").notNull().references(() => groupPosts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

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

export const groupPostsRelations = relations(groupPosts, ({ one, many }) => ({
    group: one(groups, {
        fields: [groupPosts.groupId],
        references: [groups.id],
    }),
    user: one(users, {
        fields: [groupPosts.userId],
        references: [users.id],
    }),
    comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
    post: one(groupPosts, {
        fields: [postComments.postId],
        references: [groupPosts.id],
    }),
    user: one(users, {
        fields: [postComments.userId],
        references: [users.id],
    }),
}));