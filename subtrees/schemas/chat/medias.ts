import { sql } from "drizzle-orm";
import {
    bigint,
    jsonb,
    pgTable,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

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
});
