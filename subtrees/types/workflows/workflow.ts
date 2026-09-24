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

/** A change between existing ranks. First assignment does not emit this event. */
export type RankChangedWorkflowEvent = {
	type: typeof WorkflowEvents.rank.CHANGED;
	locationId: string;
	memberId: string;
	processId: string;
	fromRankId: string;
	toRankId: string;
};

/** Emitted only for a newly created attendance row, not edits or checkout. */
export type AttendanceRecordedWorkflowEvent = {
	type: typeof WorkflowEvents.attendance.RECORDED;
	locationId: string;
	memberId: string;
	attendanceId: string;
};

/** Creation counts even before the conversation receives its first message. */
export type SupportCreatedWorkflowEvent = {
	type: typeof WorkflowEvents.support.CREATED;
	locationId: string;
	memberId: string;
	conversationId: string;
};

/** A new confirmed registration, including a pending seat that becomes registered. */
export type EventRegisteredWorkflowEvent = {
	type: typeof WorkflowEvents.event.REGISTERED;
	locationId: string;
	memberId: string;
	eventId: string;
	registrationId: string;
};

/** Order creation counts whether the new order is paid or still pending. */
export type OrderCreatedWorkflowEvent = {
	type: typeof WorkflowEvents.order.CREATED;
	locationId: string;
	memberId: string;
	orderId: string;
};

/** Backend-supported event payloads. Extend this union as dispatch support is added. */
export type WorkflowEvent =
	| PaymentFailedWorkflowEvent
	| EventRegisteredWorkflowEvent
	| OrderCreatedWorkflowEvent
	| MemberJoinedWorkflowEvent
	| MemberUpdatedWorkflowEvent
	| RankChangedWorkflowEvent
	| AttendanceRecordedWorkflowEvent
	| SupportCreatedWorkflowEvent;

/**
 * The event saved in workflowQueues.metadata.trigger. `type` selects its fields:
 * attendance carries attendanceId; rank changes carry the old/new rank IDs.
 * Member/location scope already belongs to the run and its workflow.
 * Add each new supported event here too; do not add optional fields for every event.
 */
export type WorkflowRunTrigger =
	| Omit<PaymentFailedWorkflowEvent, "memberId" | "locationId">
	| Omit<EventRegisteredWorkflowEvent, "memberId" | "locationId">
	| Omit<OrderCreatedWorkflowEvent, "memberId" | "locationId">
	| Omit<MemberJoinedWorkflowEvent, "memberId" | "locationId">
	| Omit<MemberUpdatedWorkflowEvent, "memberId" | "locationId">
	| Omit<RankChangedWorkflowEvent, "memberId" | "locationId">
	| Omit<AttendanceRecordedWorkflowEvent, "memberId" | "locationId">
	| Omit<SupportCreatedWorkflowEvent, "memberId" | "locationId">;

/** New runs keep event context, frozen actions, and worker state separate. */
export type WorkflowRunMetadata = {
	trigger: WorkflowRunTrigger;
	nodes: TypedWorkflowNode[];
	execution?: Record<string, unknown>;
};

/** A confirmed failed payment attempt, not an unpaid placeholder or unknown result. */
export type PaymentFailedWorkflowEvent = {
	type: typeof WorkflowEvents.payment.FAILED;
	locationId: string;
	memberId: string;
	transactionId: string;
};

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

// Raw database JSON still needs runtime validation when the worker loads it.
export type WorkflowQueue = Omit<WorkflowQueueRow, "metadata"> & {
	metadata: WorkflowRunMetadata;
	workflow?: Workflow;
};

export type WorkflowLog = WorkflowLogRow & {
	workflow?: Workflow;
	queue?: WorkflowQueue;
};

export type NewWorkflow = typeof workflows.$inferInsert;

export type NewWorkflowQueue = Omit<typeof workflowQueues.$inferInsert, "metadata"> & {
	metadata: WorkflowRunMetadata;
};

export type NewWorkflowLog = typeof workflowLogs.$inferInsert;
