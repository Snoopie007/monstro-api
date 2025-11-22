import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, boolean, unique, integer } from "drizzle-orm/pg-core";
import { members } from "../members";
import { comments } from "./comments";
import { users } from "../users";

export const moments = pgTable("moments", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('mem_')`),
    title: text("title").notNull(),
    description: text("description"),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    comments: integer("comments").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    tags: text("tags").array().default(sql`'{}'`),
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});



export const momentLikes = pgTable("moment_likes", {
    momentId: text("moment_id").notNull().references(() => moments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("unique_moment_likes_moment_user").on(t.momentId, t.userId),
]);

export const momentsRelations = relations(moments, ({ one, many }) => ({
    user: one(users, {
        fields: [moments.userId],
        references: [users.id],
    }),
    comments: many(comments),
    momentLikes: many(momentLikes),
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