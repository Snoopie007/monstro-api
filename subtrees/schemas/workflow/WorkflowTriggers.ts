import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { workflows } from "./Workflows";
import type { TriggerNodeData } from "../../types/workflow";

export const workflowTriggers = pgTable("workflow_triggers", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('wft_')`),
	workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	data: jsonb("data").$type<TriggerNodeData>().notNull().default(sql`'[]'::jsonb`),
}, (t) => [
	index("workflow_triggers_workflow_id_idx").on(t.workflowId),
	index("workflow_triggers_type_idx").on(t.type),
]);
