// schema/reactions.ts
import { pgTable, text, jsonb, timestamp, unique, pgView, check, index } from 'drizzle-orm/pg-core';
import { users } from '../users';
import { eq, relations, sql } from 'drizzle-orm';
import { messages } from './chats';
import { groupPosts } from './groups';
import { moments } from './moments';
import { comments } from './comments';
import type { ReactionEmoji } from '@/types';
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

// Views as Drizzle schemas
export const reactionCounts = pgView('reaction_counts').as((qb) =>
	qb.select({
		ownerType: reactions.ownerType,
		ownerId: reactions.ownerId,
		display: sql<string>`emoji->>'value'`.as('display'),
		type: sql<string>`emoji->>'type'`.as('type'),
		count: sql<number>`count(*)`.as('count'),
		userNames: sql<string[]>`array_agg(u.name order by r.created_at)`.as('user_names'),
		userIds: sql<string[]>`array_agg(r.user_id order by r.created_at)`.as('user_ids'),
	})
		.from(reactions)
		.innerJoin(users, eq(reactions.userId, users.id))
		.groupBy(reactions.ownerType, reactions.ownerId, reactions.emoji)
);

export const userReactions = pgView('user_reactions').as((qb) =>
	qb.select({
		id: reactions.id,
		userId: reactions.userId,
		ownerType: reactions.ownerType,
		ownerId: reactions.ownerId,
		display: sql<string>`emoji->>'value'`.as('display'),
		type: sql<string>`emoji->>'type'`.as('type'),
		created: reactions.created,
	}).from(reactions)
);

export const reactionsRelations = relations(reactions, ({ one }) => ({
	user: one(users, {
		fields: [reactions.userId],
		references: [users.id],
	}),
	message: one(messages, {
		fields: [reactions.ownerId],
		references: [messages.id],
	}),
	post: one(groupPosts, {
		fields: [reactions.ownerId],
		references: [groupPosts.id],
	}),
	moment: one(moments, {
		fields: [reactions.ownerId],
		references: [moments.id],
	}),
	comment: one(comments, {
		fields: [reactions.ownerId],
		references: [comments.id],
	}),
}));