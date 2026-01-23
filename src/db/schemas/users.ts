import { text, timestamp, pgTable, uuid, index, boolean, unique, integer } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { relations, sql } from "drizzle-orm";
import { members } from "./members";
import { vendors } from "./vendors";
import { staffs } from "./staffs";
import { userFeeds } from "./chat/moments";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    username: text("username").notNull(),
    isChild: boolean("is_child").notNull().default(false),
    discriminator: integer("discriminator").notNull(), // 4-digit number as string
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    unique("unique_username_discriminator").on(t.username, t.discriminator),
]);

export const userNotifications = pgTable("user_notifications", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: ["ios", "android"] }).notNull(),
    token: text("token").notNull().unique(),
    deviceModelId: text("device_model_id"),
    deviceName: text("device_name"),
    enabled: boolean("enabled").notNull().default(true),
    lastSeen: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    index("idx_user_notifications_user_id").on(t.userId),
    index("idx_user_notifications_user_platform").on(t.userId, t.platform),
    index("idx_user_notifications_enabled").on(t.enabled).where(sql`${t.enabled} = true`),
    index("idx_user_notifications_token").on(t.token),
]);




export const usersRelations = relations(users, ({ many, one }) => ({
    accounts: many(accounts),
    member: one(members, {
        fields: [users.id],
        references: [members.userId],
    }),
    vendor: one(vendors, {
        fields: [users.id],
        references: [vendors.userId],
    }),
    staff: one(staffs, {
        fields: [users.id],
        references: [staffs.userId],
    }),
    feeds: many(userFeeds, { relationName: 'userFeeds' }),
    authorFeeds: many(userFeeds, { relationName: 'authorFeeds' }),
    notifications: many(userNotifications),
}));

export const userNotificationsRelations = relations(userNotifications, ({ one }) => ({
    user: one(users, {
        fields: [userNotifications.userId],
        references: [users.id],
    }),
}));
