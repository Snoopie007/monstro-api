// Saved trigger identifiers, settings, and database records.
import type { WorkflowEvents } from "../../constants/workflow";
import type { workflowTriggers } from "../../schemas/workflow";
import type { BaseNodeData, Workflow } from "./workflow";

export type WorkflowConfigs = Record<string, unknown>;

type WorkflowEventValues<T> = T[keyof T];

/**
 * Trigger identifiers derived from packages/constants/workflow.ts.
 * New identifiers in an existing group are included automatically.
 * When adding a new group, add its WorkflowEventValues entry to this union.
 */
export type WorkflowTriggerType =
	| WorkflowEventValues<typeof WorkflowEvents.member>
	| WorkflowEventValues<typeof WorkflowEvents.custom>;

export type TriggerNodeData = BaseNodeData & {
	config?: WorkflowConfigs;
};

/** In-memory / client representation of a workflow trigger. */
export type WorkflowTriggerItem = {
	id: string;
	type: WorkflowTriggerType | string;
	data: TriggerNodeData;
};

type WorkFlowTriggerRow = typeof workflowTriggers.$inferSelect;

export type WorkFlowTrigger = Omit<WorkFlowTriggerRow, "data"> & {
	data: TriggerNodeData;
	workflow?: Workflow;
};

export type NewWorkFlowTrigger = typeof workflowTriggers.$inferInsert;
