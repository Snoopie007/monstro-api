/**
 * Stable identifiers for workflow events persisted on workflow triggers.
 *
 * When adding a trigger, declare its identifier here. In packages/types/workflows/,
 * add new event groups to WorkflowTriggerType in triggers.ts. Define supported
 * event payloads in workflow.ts and include them in WorkflowEvent.
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
