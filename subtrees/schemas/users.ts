import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    username: text("username").notNull(),
    isChild: boolean("is_child").notNull().default(false),
    lastSeen: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    isOnline: boolean("is_online").notNull().default(false),
    discriminator: integer("discriminator").notNull().default(sql`generate_discriminator()`),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    unique("unique_username_discriminator").on(t.username, t.discriminator),
    index("idx_users_last_seen").on(t.lastSeen),
    index("idx_users_is_online").on(t.isOnline),
]);

export const userNotifications = pgTable("user_notifications", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: ["ios", "android"] }).notNull(),
    token: text("token").notNull(),
    nativeToken: text("native_token").notNull(),
    deviceId: text("device_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastSeen: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_user_notifications_user_id").on(t.userId),
    index("idx_user_notifications_user_platform").on(t.userId, t.platform),
    index("idx_user_notifications_enabled").on(t.enabled).where(sql`${t.enabled} = true`),
    index("idx_user_notifications_token").on(t.token),
    index("idx_user_notifications_native_token").on(t.nativeToken),
    unique("unique_user_notification_device_id").on(t.userId, t.deviceId),
]);

