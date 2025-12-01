import { relations, sql } from "drizzle-orm";
import {
    text,
    timestamp,
    pgTable,
    jsonb,
    index,
    primaryKey,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { users } from "./users";
import { groups } from "./groups";
import { locations } from "./locations";

export const chats = pgTable("chats", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('cht_')`),
    startedBy: text("started_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    name: text("name"),
    groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }),
}, (t) => [
    index("idx_chats_started_by").on(t.startedBy),
    index("idx_chats_group_id").on(t.groupId),
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
    attachments: jsonb("attachments").$type<Array<Record<string, any>>>().default(sql`'[]'::jsonb`),
    readBy: text("read_by").array().default(sql`'{}'`),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_messages_chat_created").on(t.chatId, t.created),
    index("idx_messages_sender_id").on(t.senderId),
]);

export const chatsRelations = relations(chats, ({ one, many }) => ({
    started: one(members, {
        fields: [chats.startedBy],
        references: [members.id],
        relationName: "chatStartedBy",
    }),
    group: one(groups, {
        fields: [chats.groupId],
        references: [groups.id],
        relationName: "chatGroup",
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
        relationName: "chatMemberUser",
    }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
}));

