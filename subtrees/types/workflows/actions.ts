// Node settings and the typed graph used by the builder and worker.
import type { BaseNodeData } from "./workflow";
import type { MemberField } from "../member";

export type Path = {
	isDefault: boolean;
	pathId: string;
	label: string;
	field?: string;
	operator?: string;
	value?: string;
	type?: "string" | "number" | "boolean";
};

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

export type FieldOptionGroup = {
	name: string;
	options: MemberField[];
};
