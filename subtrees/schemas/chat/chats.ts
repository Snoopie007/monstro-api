import { sql } from "drizzle-orm";
import {
    text,
    timestamp,
    pgTable,
    index,

    primaryKey,
    foreignKey,
} from "drizzle-orm/pg-core";
import { users } from "../users";
import { locations } from "../locations";
import { groups } from "./groups";

export const chats = pgTable("chats", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('cht_')`),
    startedBy: text("started_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default('New Chat'),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
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
    senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "set null" }),
    replyId: text("reply_id"),
    content: text("content"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    foreignKey({
        columns: [t.replyId],
        foreignColumns: [t.id],
        name: "fk_messages_reply_id",
    }),
    index("idx_messages_chat_created").on(t.chatId, t.created),
    index("idx_messages_sender_id").on(t.senderId),
]);
