import { pgTable, text, timestamp, integer, unique, jsonb } from 'drizzle-orm/pg-core';

import { vector } from 'drizzle-orm/pg-core';

import { sql } from "drizzle-orm/sql";

import { locations } from './locations';

import { bots } from './bots';

import { documentType } from './BotEnums';

export const documents = pgTable('documents', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  name: text('name').notNull(),
  filePath: text('file_path'),
  url: text('url'),
  type: documentType('type').notNull(),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  size: integer('size'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const documentMetadata = pgTable('document_metadata', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  uniqueDocument: unique('document_metadata_document_unique').on(table.documentId),
}));

export const documentChunks = pgTable('document_chunks', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 384 }),
});

export const botKnowledge = pgTable('bot_knowledge', {
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueBotDocument: unique('bot_knowledge_unique').on(table.botId, table.documentId),
}));
