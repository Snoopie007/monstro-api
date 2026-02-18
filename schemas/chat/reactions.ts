// schema/reactions.ts
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, pgView, text, timestamp, unique } from 'drizzle-orm/pg-core';
import type { ReactionEmoji } from '../../types/reactions';
import { users } from '../users';


// Main reactions table
export const reactions = pgTable('reactions', {
    id: text('id').primaryKey().default(sql`uuid_base62()`),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    ownerType: text('owner_type').notNull(),
    ownerId: text('owner_id').notNull(),
    emoji: jsonb('emoji').$type<ReactionEmoji>().notNull(),
    created: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    unique('unique_reaction').on(t.userId, t.ownerType, t.ownerId, t.emoji),
    check('owner_type_check', sql`owner_type IN ('message', 'post', 'moment')`),
    index('idx_reactions_owner').on(t.ownerId, t.ownerType),
    index('idx_reactions_user_id').on(t.userId),
    index('idx_reactions_emoji').using('gin', t.emoji),
    index('idx_reactions_created_at').on(t.created)
]);

// Views as Drizzle schemas - using existing SQL view definition
export const reactionCounts = pgView('reaction_counts', {
    ownerType: text('owner_type').notNull(),
    ownerId: text('owner_id').notNull(),
    display: text('display').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    count: integer('count').notNull(),
    userNames: text('user_names').array().notNull(),
    userIds: text('user_ids').array().notNull(),
}).existing();

export const userReactions = pgView('user_reactions').as((qb) =>
    qb.select({
        id: reactions.id,
        userId: reactions.userId,
        ownerType: reactions.ownerType,
        ownerId: reactions.ownerId,
        display: sql<string>`emoji->>'value'`.as('display'),
        name: sql<string>`emoji->>'name'`.as('name'),
        type: sql<string>`emoji->>'type'`.as('type'),
        created: reactions.created,
    }).from(reactions)
);
