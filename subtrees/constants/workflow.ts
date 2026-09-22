/**
 * Stable identifiers for workflow events persisted on workflow triggers.
 *
 * When adding a trigger, declare its identifier here. In packages/types/workflow.ts,
 * add any new event group to WorkflowTriggerType, define the event's payload type,
 * and include it in WorkflowEvent once backend dispatch supports it.
 * Also update the builder catalog, settings form mapping, and API validation.
 * Adding an identifier alone does not implement or enable event dispatch.
 */
export const WorkflowEvents = {
	member: {
		JOINED: "member::joined",
		UPDATED: "member::updated",
	},
	custom: {
		REPLY: "custom::reply",
	},
} as const;
