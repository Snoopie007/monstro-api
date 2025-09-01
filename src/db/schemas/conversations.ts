import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from "drizzle-orm/sql";

import { locations } from './locations';

import { members } from './members';

import { guestContacts } from './guestContacts';

import { bots } from './bots';

import { channel, messageRole } from './BotEnums';

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
  guestContactId: text('guest_contact_id').references(() => guestContacts.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  // Note: Add CHECK constraint in migration: (member_id IS NOT NULL AND guest_contact_id IS NULL) OR (member_id IS NULL AND guest_contact_id IS NOT NULL)
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  role: messageRole('role').notNull(),
  channel: channel('channel').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const botProgress = pgTable('bot_progress', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
  guestContactId: text('guest_contact_id').references(() => guestContacts.id, { onDelete: 'cascade' }),
  completed: boolean('completed').default(false),
  currentNode: text('current_node').notNull(),
  stopped: text('stopped'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  // Note: Add CHECK constraint in migration: (member_id IS NOT NULL AND guest_contact_id IS NULL) OR (member_id IS NULL AND guest_contact_id IS NOT NULL)
});

export const botLogs = pgTable('bot_logs', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
  guestContactId: text('guest_contact_id').references(() => guestContacts.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});