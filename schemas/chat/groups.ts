import { sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, index, primaryKey, integer } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { users } from "../users";

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
    content: text("content").notNull(),
    commentCounts: integer("comment_counts").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});
