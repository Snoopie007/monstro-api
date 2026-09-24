/**
 * Stable identifiers for workflow events persisted on workflow triggers.
 *
 * When adding a trigger, declare its identifier here. In packages/types/workflows/,
 * add new event groups to WorkflowTriggerType in triggers.ts. Define supported
 * event payloads in workflow.ts and include them in WorkflowEvent and WorkflowRunTrigger.
 * Also update the builder catalog, settings form mapping, and API validation.
 * Adding an identifier alone does not implement or enable event dispatch.
 */
export const WorkflowEvents = {
	class: {
		MISSED: "class::missed",
	},
	trial: {
		CHECKED_OUT: "trial::checked_out",
	},
	payment: {
		FAILED: "payment::failed",
	},
	member: {
		JOINED: "member::joined",
		UPDATED: "member::updated",
	},
	rank: {
		CHANGED: "rank::changed",
	},
	attendance: {
		RECORDED: "attendance::recorded",
	},
	support: {
		CREATED: "support::created",
	},
	custom: {
		REPLY: "custom::reply",
	},
	event: {
		REGISTERED: "event::registered",
	},
	order: {
		CREATED: "order::created",
	},
} as const;
