import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});