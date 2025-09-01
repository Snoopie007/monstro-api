import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from "drizzle-orm/sql";

import { locations } from './locations';

import { members } from './members';

import { guestContacts } from './guestContacts';

import { workflowStatus, workflowQueueStatus } from './BotEnums';

export const workflows = pgTable('workflows', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: workflowStatus('status').notNull().default('Draft'),
  nodes: jsonb('nodes').array().notNull().default(sql`ARRAY[]::jsonb[]`),
  invalidNodes: text('invalid_nodes').array().notNull().default(sql`ARRAY[]::text[]`),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const workflowTriggers = pgTable('workflow_triggers', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
});

export const workflowQueues = pgTable('workflow_queues', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
  guestContactId: text('guest_contact_id').references(() => guestContacts.id, { onDelete: 'cascade' }),
  currentNode: text('current_node').notNull().default('start'),
  stopped: text('stopped'),
  status: workflowQueueStatus('status').notNull().default('Processing'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const workflowLogs = pgTable('workflow_logs', {
  id: text('id').primaryKey().default(sql`uuid_base62()`),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  queueId: text('queue_id').notNull().references(() => workflowQueues.id, { onDelete: 'cascade' }),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});