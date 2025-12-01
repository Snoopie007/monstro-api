import { relations, sql } from "drizzle-orm";
import {
    text,
    timestamp,
    pgTable,
    jsonb,
    index,
    primaryKey,
} from "drizzle-orm/pg-core";
import { members } from "../members";
import { users } from "../users";
import { locations } from "../locations";
import { groupPosts, groups } from "./groups";
import { moments } from "./moments";
import { reactions } from "./reactions";
import { locations } from "../locations";

export const chats = pgTable("chats", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('cht_')`),
    startedBy: text("started_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default('New Chat'),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }),
    name: text("name"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_chats_started_by").on(t.startedBy),
    index("idx_chats_location_id").on(t.locationId),
]);

export const chatMembers = pgTable("chat_members", {
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joined: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.chatId, t.userId] }),
    index("idx_chat_members_user_id").on(t.userId),
]);

export const messages = pgTable("messages", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('msg_')`),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_messages_chat_created").on(t.chatId, t.created),
    index("idx_messages_sender_id").on(t.senderId),
]);

export const media = pgTable("media", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('med_')`),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type", { enum: ["post", "message", "memory"] }).notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type", { enum: ["image", "video", "audio", "document", "other"] }).notNull(),
    fileSize: text("file_size"), // Using text instead of bigint for compatibility
    mimeType: text("mime_type"),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    altText: text("alt_text"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});



export const chatsRelations = relations(chats, ({ one, many }) => ({
    started: one(members, {
        fields: [chats.startedBy],
        references: [members.id],
        relationName: "chatStartedBy",
    }),
    location: one(locations, {
        fields: [chats.locationId],
        references: [locations.id],
    }),
    group: one(groups, {
        fields: [chats.groupId],
        references: [groups.id],
    }),
    location: one(locations, {
        fields: [chats.locationId],
        references: [locations.id],
        relationName: "chatLocation",
    }),
    chatMembers: many(chatMembers),
    messages: many(messages),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
    chat: one(chats, {
        fields: [chatMembers.chatId],
        references: [chats.id],
        relationName: "chatChatMembers",
    }),
    user: one(users, {
        fields: [chatMembers.userId],
        references: [users.id],
        relationName: "chatMemberMember",
    }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
    medias: many(media),
    reactions: many(reactions, { relationName: 'messageReactions' }),
}));

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