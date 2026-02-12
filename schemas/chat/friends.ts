import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, unique, index } from "drizzle-orm/pg-core";
import { users } from "../users";

export const friends = pgTable("friends", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62('frn_')`),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "accepted", "blocked"] }).notNull().default("pending"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    unique("unique_friends_requester_addressee").on(t.requesterId, t.addresseeId),
    index("idx_friends_requester_id").on(t.requesterId),
    index("idx_friends_addressee_id").on(t.addresseeId),
    index("idx_friends_status").on(t.status),
]);

export const friendsRelations = relations(friends, ({ one }) => ({
    requester: one(users, {
        fields: [friends.requesterId],
        references: [users.id],
        relationName: "friendRequester",
    }),
    addressee: one(users, {
        fields: [friends.addresseeId],
        references: [users.id],
        relationName: "friendAddressee",
    }),
}));
