import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { messages } from "./chats";
import { groupPosts } from "./groups";
import { moments } from "./moments";

export const media = pgTable("media", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type", { enum: ["post", "message", "memory"] }).notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type", { enum: ["image", "video", "audio", "document", "other"] }).notNull(),
    fileSize: integer("file_size"), // Using text instead of bigint for compatibility
    mimeType: text("mime_type"),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    altText: text("alt_text"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});


export const mediaRelations = relations(media, ({ one }) => ({
    message: one(messages, {
        fields: [media.ownerId],
        references: [messages.id],
    }),
    post: one(groupPosts, {
        fields: [media.ownerId],
        references: [groupPosts.id],
    }),
    moment: one(moments, {
        fields: [media.ownerId],
        references: [moments.id],
    }),
}));