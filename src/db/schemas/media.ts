import { relations, sql } from "drizzle-orm";
import {
    bigint,
    index,
    jsonb,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { messages } from "./chats";
import { groupPosts } from "./groups";

export const media = pgTable("media", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('med_')`),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type", { enum: ["post", "message", "moment"] }).notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type", { enum: ["image", "video", "audio", "document", "other"] }).notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    mimeType: text("mime_type"),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    altText: text("alt_text"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_media_owner").on(t.ownerId, t.ownerType),
    index("idx_media_owner_type").on(t.ownerType),
    index("idx_media_created_at").on(t.created),
]);

export const mediaRelations = relations(media, ({ one }) => ({
    post: one(groupPosts, {
        fields: [media.ownerId],
        references: [groupPosts.id],
    }),
    message: one(messages, {
        fields: [media.ownerId],
        references: [messages.id],
    }),
}));


