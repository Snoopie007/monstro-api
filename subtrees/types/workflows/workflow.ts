// Workflow records, emitted events, and saved execution progress.
import type { workflows, workflowQueues, workflowLogs } from "../../schemas/workflow";
import type { WorkflowEvents } from "../../constants/workflow";
import type { Location } from "../location";
import type { WorkflowStatus } from "../DatabaseEnums";
import type { TypedWorkflowNode, WorkflowNodeData } from "./actions";
import type { WorkFlowTrigger, TriggerNodeData } from "./triggers";

export type { WorkflowStatus };

export type BaseNodeData = { label: string };

/**
 * Payload for Member Joined. Each additional supported event needs its own
 * payload type with a literal `type` from WorkflowEvents and its required data.
 * Include that payload type in WorkflowEvent when its dispatch logic is ready.
 */
export type MemberJoinedWorkflowEvent = {
	type: typeof WorkflowEvents.member.JOINED;
	locationId: string;
	memberId: string;
};

/** Fields supported by the Member Updated trigger. */
export type MemberUpdatedField = "firstName" | "lastName" | "email" | "phone" | `custom:${string}`;

export type MemberUpdatedWorkflowEvent = {
	type: typeof WorkflowEvents.member.UPDATED;
	locationId: string;
	memberId: string;
	changedFields: MemberUpdatedField[];
};

/** Backend-supported event payloads. Extend this union as dispatch support is added. */
export type WorkflowEvent = MemberJoinedWorkflowEvent | MemberUpdatedWorkflowEvent;

/**
 * @deprecated Use `WorkflowNodeData`, `NodeDataByType<T>`, or `TriggerNodeData`.
 */
export type NodeData = WorkflowNodeData | TriggerNodeData;

type WorkflowRow = typeof workflows.$inferSelect;

type WorkflowQueueRow = typeof workflowQueues.$inferSelect;

type WorkflowLogRow = typeof workflowLogs.$inferSelect;

export type Workflow = Omit<WorkflowRow, "nodes"> & {
	nodes: TypedWorkflowNode[] | null;
	location?: Location;
	queues?: WorkflowQueue[];
	triggers?: WorkFlowTrigger[];
};

export type WorkflowQueue = WorkflowQueueRow & {
	workflow?: Workflow;
};

export type WorkflowLog = WorkflowLogRow & {
	workflow?: Workflow;
	queue?: WorkflowQueue;
};

export type NewWorkflow = typeof workflows.$inferInsert;

export type NewWorkflowQueue = typeof workflowQueues.$inferInsert;

export type NewWorkflowLog = typeof workflowLogs.$inferInsert;
