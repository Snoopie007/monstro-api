import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { workflowQueues } from "./WorkflowQueues";
import { workflows } from "./Workflows";

export const workflowLogs = pgTable("workflow_logs", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('wlg_')`),
	workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
	queueId: text("queue_id").notNull().references(() => workflowQueues.id, { onDelete: "cascade" }),
	metadata: jsonb("metadata").notNull().default({}),
	errorMessage: text("error_message"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("workflow_logs_queue_id_idx").on(t.queueId),
	index("workflow_logs_workflow_id_idx").on(t.workflowId),
	index("workflow_logs_created_at_idx").on(t.created),
]);
