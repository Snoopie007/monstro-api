import {
	workflowLogs,
	workflowQueues,
	workflowTriggers,
	workflows,
} from "../schemas/workflow";
import type { WorkflowEvents } from "../constants/workflow";
import type { Location } from "./location";
import type { MemberField } from "./member";
import type { WorkflowStatus } from "./DatabaseEnums";

export type { WorkflowStatus };

export type Path = {
	isDefault: boolean;
	pathId: string;
	label: string;
	field?: string;
	operator?: string;
	value?: string;
	type?: "string" | "number" | "boolean";
};

export type WorkflowConfigs = Record<string, unknown>;

export type BaseNodeData = { label: string };

export type StartNodeData = BaseNodeData;
export type EndNodeData = BaseNodeData;
export type PathNodeData = BaseNodeData;

export type MessageNodeData = BaseNodeData & {
	content: string;
};

export type DelayNodeData = BaseNodeData & {
	delay: {
		mode: "duration" | "datetime";
		days?: number;
		hours?: number;
		minutes?: number;
		at?: string;
	};
};

export type ConditionNodeData = BaseNodeData & {
	paths: Path[];
};

export type EmailNodeData = BaseNodeData & {
	fromName?: string;
	fromEmail: string;
	subject: string;
	message: string;
};
export type NotificationNodeData = BaseNodeData & {
	toEmail: string;
	subject: string;
	message: string;
};

type WorkflowEventValues<T> = T[keyof T];

/**
 * Trigger identifiers derived from packages/constants/workflow.ts.
 * New identifiers in an existing group are included automatically.
 * When adding a new group, add its WorkflowEventValues entry to this union.
 */
export type WorkflowTriggerType =
	| WorkflowEventValues<typeof WorkflowEvents.member>
	| WorkflowEventValues<typeof WorkflowEvents.custom>;

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

/** Backend-supported event payloads. Extend this union as dispatch support is added. */
export type MemberUpdatedField = "firstName" | "lastName" | "email" | "phone" | `custom:${string}`;

export type MemberUpdatedWorkflowEvent = {
	type: typeof WorkflowEvents.member.UPDATED;
	locationId: string;
	memberId: string;
	changedFields: MemberUpdatedField[];
};

export type WorkflowEvent = MemberJoinedWorkflowEvent | MemberUpdatedWorkflowEvent;

export type TriggerNodeData = BaseNodeData & {
	config?: WorkflowConfigs;
};

/** In-memory / client representation of a workflow trigger. */
export type WorkflowTriggerItem = {
	id: string;
	type: WorkflowTriggerType | string;
	data: TriggerNodeData;
};

type WorkflowNodeBase = {
	id: string;
	position: { x: number; y: number };
	parentId?: string;
};

export type TypedWorkflowNode =
	| (WorkflowNodeBase & { type: "start"; data: StartNodeData })
	| (WorkflowNodeBase & { type: "end"; data: EndNodeData })
	| (WorkflowNodeBase & { type: "path"; data: PathNodeData })
	| (WorkflowNodeBase & { type: "message"; data: MessageNodeData })
	| (WorkflowNodeBase & { type: "sms"; data: MessageNodeData })
	| (WorkflowNodeBase & { type: "delay"; data: DelayNodeData })
	| (WorkflowNodeBase & { type: "condition"; data: ConditionNodeData })
	| (WorkflowNodeBase & { type: "email"; data: EmailNodeData })
	| (WorkflowNodeBase & { type: "notification"; data: NotificationNodeData });

export type WorkflowNodeType = TypedWorkflowNode["type"];

export type ActionNodeType = Exclude<
	WorkflowNodeType,
	"start" | "end" | "path" | "sms"
>;

export type NodeDataByType<T extends WorkflowNodeType> =
	Extract<TypedWorkflowNode, { type: T }>["data"];

export type WorkflowNodeData = TypedWorkflowNode["data"];

/** Serialized node persisted on `workflows.nodes` (edges rebuilt from `parentId`). */
export type WorkflowNode = TypedWorkflowNode;

/**
 * @deprecated Use `WorkflowNodeData`, `NodeDataByType<T>`, or `TriggerNodeData`.
 */
export type NodeData = WorkflowNodeData | TriggerNodeData;

export type FieldOptionGroup = {
	name: string;
	options: MemberField[];
};

type WorkflowRow = typeof workflows.$inferSelect;
type WorkFlowTriggerRow = typeof workflowTriggers.$inferSelect;
type WorkflowQueueRow = typeof workflowQueues.$inferSelect;
type WorkflowLogRow = typeof workflowLogs.$inferSelect;

export type Workflow = Omit<WorkflowRow, "nodes"> & {
	nodes: TypedWorkflowNode[] | null;
	location?: Location;
	queues?: WorkflowQueue[];
	triggers?: WorkFlowTrigger[];
};

export type WorkFlowTrigger = Omit<WorkFlowTriggerRow, "data"> & {
	data: TriggerNodeData;
	workflow?: Workflow;
};

export type WorkflowQueue = WorkflowQueueRow & {
	workflow?: Workflow;
};

export type WorkflowLog = WorkflowLogRow & {
	workflow?: Workflow;
	queue?: WorkflowQueue;
};

export type NewWorkflow = typeof workflows.$inferInsert;
export type NewWorkFlowTrigger = typeof workflowTriggers.$inferInsert;
export type NewWorkflowQueue = typeof workflowQueues.$inferInsert;
export type NewWorkflowLog = typeof workflowLogs.$inferInsert;
