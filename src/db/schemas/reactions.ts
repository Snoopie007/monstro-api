import { relations, sql } from "drizzle-orm";
import { text, timestamp, pgTable, jsonb, unique, index, pgView } from "drizzle-orm/pg-core";
import { users } from "./users";

// Emoji type for reactions
export type EmojiData = {
    value: string;  // The emoji character, e.g., "🔥"
    name: string;   // The emoji name, e.g., "fire"
    type: string;   // The type, e.g., "emoji"
};

// Main reactions table - polymorphic design
export const reactions = pgTable("reactions", {
    id: text("id").primaryKey().default(sql`uuid_base62('rxn_')`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ownerType: text("owner_type").notNull(), // 'post', 'comment', 'message'
    ownerId: text("owner_id").notNull(),
    emoji: jsonb("emoji").$type<EmojiData>().notNull(),
    created: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    unique("unique_user_reaction").on(t.userId, t.ownerType, t.ownerId, t.emoji),
    index("idx_reactions_owner").on(t.ownerId, t.ownerType),
    index("idx_reactions_user_id").on(t.userId),
]);

// Relations
export const reactionsRelations = relations(reactions, ({ one }) => ({
    user: one(users, {
        fields: [reactions.userId],
        references: [users.id],
    }),
}));

// Type for aggregated reaction counts (used in queries)
export type ReactionCount = {
    ownerType: string;
    ownerId: string;
    display: string;
    name: string;
    type: string;
    count: number;
    userNames: string[];
    userIds: string[];
};

// Note: The reaction_counts VIEW is created in the migration file
// and queried using raw SQL since Drizzle ORM views are complex to define
// with aggregations. See the migration for the VIEW definition.

