import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { WorkflowStatusEnum } from "../DatabaseEnums";
import { locations } from "../locations";
import type { WorkflowNode } from "../../types/workflows/actions";

export const workflows = pgTable("workflows", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('wfl_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	nodes: jsonb("nodes").$type<WorkflowNode[]>().notNull().default(sql`'[]'::jsonb`),
	invalidNodes: text("invalid_nodes").array().notNull().default(sql`'{}'::text[]`),
	status: WorkflowStatusEnum("status").notNull().default("draft"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("workflows_location_id_idx").on(t.locationId),
	index("workflows_status_idx").on(t.status),
]);
