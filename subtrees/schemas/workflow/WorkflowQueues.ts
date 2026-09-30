import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { workflows } from "./Workflows";
import { members } from "../members";

export const workflowQueues = pgTable("workflow_queues", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('wfq_')`),
	workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	currentNode: text("current_node").notNull(),
	stopped: text("stopped"),
	metadata: jsonb("metadata").notNull().default({}),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("workflow_queues_workflow_id_idx").on(t.workflowId),
	index("workflow_queues_member_id_idx").on(t.memberId),
	index("workflow_queues_active_idx").on(t.workflowId).where(sql`${t.stopped} IS NULL`),
	uniqueIndex("workflow_queues_one_active_per_member")
		.on(t.workflowId, t.memberId)
		.where(sql`${t.stopped} IS NULL`),
]);
