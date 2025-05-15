import { integer, serial, text, timestamp, pgTable, boolean, jsonb, json, unique, vector } from "drizzle-orm/pg-core";
import { relations, sql } from 'drizzle-orm';
import { AILogState, NodeDataType } from "@/types";
import { locations } from "./locations";
import { Node } from "@xyflow/react";


export const aiBots = pgTable("ai_bots", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    botName: text("bot_name").notNull(),
    description: text("description"),
    initialMessage: text("initial_message"),
    reason: text("reason").notNull(),
    locationId: integer("location_id").notNull(),
    responseDetails: text("response_details").notNull(),
    personality: text("personality").array().notNull().default(sql`[]::text[]`),
    temperature: integer("temperature").notNull().default(0),
    maxTokens: integer("max_tokens").notNull().default(0),
    model: text("model").notNull(),
    invalidNodes: text("invalid_nodes").array().notNull().default(sql`[]::text[]`),
    objectives: jsonb("objectives").array().$type<Node<NodeDataType>[]>(),
    status: text("status", { enum: ['Draft', 'Active', 'Pause', 'Deleted'] }).notNull().default("Draft"),
    created: timestamp("created_at", { precision: 6, withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { precision: 6, withTimezone: true }),
});



export const botLogs = pgTable("bot_logs", {
    id: serial("id").primaryKey(),
    queueId: integer("queue_id").notNull(),
    nodeId: text("node_id").notNull(),
    messageId: integer("message_id").notNull(),
    type: text("type").notNull(),
    state: jsonb("state").$type<AILogState>().default(sql`'{}'::jsonb`),
    errors: jsonb("errors").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    conditions: jsonb("conditions").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    response: text("response"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const botQueues = pgTable("bot_queues", {
    id: serial("id").primaryKey().notNull(),
    botId: integer("bot_id").notNull().references(() => aiBots.id, { onDelete: "cascade" }),
    prospectId: text("prospect_id").notNull(),
    currentNode: text("current_node").notNull().default("start"),
    completedNodes: text("completed_nodes").array().notNull().default(sql`ARRAY[]::text[]`),
    stopped: boolean("stopped").notNull().default(false),
    stoppedReason: text("stopped_reason"),
    attempts: integer("attempts").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [unique('bot_prospect_unique').on(t.prospectId)]);


export const documents = pgTable("documents", {
    id: serial("id").primaryKey().notNull(),
    name: text("name").notNull(),
    locationId: integer("location_id").notNull(),
    created: timestamp("created_at", { precision: 6, withTimezone: true }).notNull().defaultNow(),
});

export const documentChunks = pgTable("document_chunks", {
    id: serial("id").primaryKey().notNull(),
    documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    chunk: text("chunk").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
});

export const botKnowledge = pgTable("bot_knowledge", {
    botId: integer("bot_id").notNull().references(() => aiBots.id, { onDelete: "cascade" }),
    documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
});

export const documentsRelations = relations(documents, ({ many, one }) => ({
    chunks: many(documentChunks),
    botKnowledge: many(botKnowledge),
}));


export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
    document: one(documents, {
        fields: [documentChunks.documentId],
        references: [documents.id],
    }),
}));


export const botKnowledgeRelations = relations(botKnowledge, ({ one }) => ({
    bot: one(aiBots, {
        fields: [botKnowledge.botId],
        references: [aiBots.id],
    }),
    document: one(documents, {
        fields: [botKnowledge.documentId],
        references: [documents.id],
    }),
}));

export const botQueuesRelations = relations(botQueues, ({ one, many }) => ({
    bot: one(aiBots, {
        fields: [botQueues.botId],
        references: [aiBots.id],
    }),
    logs: many(botLogs)
}));

export const aiBotsRelations = relations(aiBots, ({ one, many }) => ({
    queues: many(botQueues),
    knowledge: one(botKnowledge, {
        fields: [aiBots.id],
        references: [botKnowledge.botId],
    }),
    location: one(locations, {
        fields: [aiBots.locationId],
        references: [locations.id],
    }),
}));


export const botLogsRelations = relations(botLogs, ({ one }) => ({
    queue: one(botQueues, {
        fields: [botLogs.queueId],
        references: [botQueues.id],
    }),
}));
