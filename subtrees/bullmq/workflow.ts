import { z } from "zod";

/** Queue used to resume persisted workflow runs. */
export const WORKFLOW_QUEUE = "workflows";

/** BullMQ job name for one persisted workflow run. */
export const EXECUTE_WORKFLOW_JOB = "execute";

/** Stable BullMQ job ID used to deduplicate delivery of one persisted run. */
export function workflowRunJobId(runId: string) {
	return `workflow-run-${runId}`;
}

/** Stable ID for the delayed continuation of one workflow node. */
export function workflowDelayJobId(runId: string, nodeId: string) {
	return `workflow-delay-${runId}-${nodeId}`;
}

/**
 * Workflow jobs carry only the durable run identifier. The worker reads the
 * latest run state and the frozen node snapshot from Postgres.
 */
export const WorkflowJobSchema = z.object({
	runId: z.string().min(1),
}).strict();

export type WorkflowJobData = z.infer<typeof WorkflowJobSchema>;
