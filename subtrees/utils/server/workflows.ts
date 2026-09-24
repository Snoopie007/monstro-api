import { WorkflowEvents } from "../../constants/workflow";
import { changedMemberFields, effectiveMemberFields, parseMemberUpdatedFields } from "../workflowFields";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { workflowQueues, workflowTriggers, workflows } from "../../schemas/workflow";
import { and, asc, eq, inArray } from "drizzle-orm";
import { members, memberFields, memberCustomFields } from "../../schemas/members";
import { memberLocations } from "../../schemas/MemberLocation";
import type { WorkflowEvent, WorkflowNode } from "../../types/workflows";

export type WorkflowTransaction = Pick<PostgresJsDatabase, "select" | "insert">;

type WorkflowNodeShape = Pick<WorkflowNode, "id" | "type">;

/**
 * A workflow run starts at the canonical Start node. The builder supplies a
 * Start/End pair even for a new draft, but older API paths can still activate
 * a workflow with an empty node list. This slice only checks for the canonical
 * endpoints; a worker slice can add full graph validation before execution.
 */
export function hasStartAndEndNodes(nodes: unknown): nodes is WorkflowNode[] {
	if (!Array.isArray(nodes)) return false;

	const hasStart = nodes.some(
		(node: unknown): node is WorkflowNodeShape =>
			!!node && typeof node === "object"
				&& (node as WorkflowNodeShape).id === "start"
				&& (node as WorkflowNodeShape).type === "start",
	);
	const hasEnd = nodes.some(
		(node: unknown): node is WorkflowNodeShape =>
			!!node && typeof node === "object"
				&& (node as WorkflowNodeShape).id === "end"
				&& (node as WorkflowNodeShape).type === "end",
	);

	return hasStart && hasEnd;
}

/**
 * Create durable runs for active workflows listening to this event.
 *
 * Call this with the caller's transaction. That keeps the run insert atomic
 * with the member-location write that emitted the event. The partial unique
 * index on workflow_queues prevents repeated or concurrent active runs for
 * the same workflow and member.
 */
export async function dispatchWorkflowTrigger(
	tx: WorkflowTransaction,
	event: WorkflowEvent,
) {
	const matches = await tx
		.select({
			workflowId: workflows.id,
			nodes: workflows.nodes,
			triggerData: workflowTriggers.data,
		})
		.from(workflows)
		.innerJoin(workflowTriggers, eq(workflowTriggers.workflowId, workflows.id))
		.where(and(
			eq(workflows.locationId, event.locationId),
			eq(workflows.status, "active"),
			eq(workflowTriggers.type, event.type),
		));

	// A workflow may have duplicate matching trigger rows. Only try one run per
	// workflow; the database index also protects against concurrent dispatches.
	const uniqueMatches = new Map<string, WorkflowNode[]>();
	for (const match of matches) {
		if (event.type === WorkflowEvents.member.UPDATED) {
			const fields = parseMemberUpdatedFields(match.triggerData?.config?.fields);
			if (!fields?.some((field) => event.changedFields.includes(field))) continue;
		}
		if (!uniqueMatches.has(match.workflowId) && hasStartAndEndNodes(match.nodes)) {
			uniqueMatches.set(match.workflowId, match.nodes);
		}
	}

	const created = [];
	for (const [workflowId, nodes] of uniqueMatches) {
		const [queue] = await tx
			.insert(workflowQueues)
			.values({
				workflowId,
				memberId: event.memberId,
				currentNode: "start",
				metadata: {
					triggerType: event.type,
					...(event.type === WorkflowEvents.member.UPDATED ? { changedFields: event.changedFields } : {}),
					locationId: event.locationId,
					memberId: event.memberId,
					nodes,
				},
			})
			.onConflictDoNothing()
			.returning();

		if (queue) created.push(queue);
	}

	return created;
}

export type MemberWorkflowState = {
	memberId: string;
	locationId?: string;
	locations: Map<string, Record<string, string>>;
};

/**
 * Call before writing. Lock the member first, then location rows in ID order.
 * All participating writers use this order so their before/after comparisons
 * cannot interleave, including a custom-field insert that has no row to lock yet.
 */
export async function captureMemberWorkflowState(
	tx: WorkflowTransaction, memberId: string, locationId?: string,
): Promise<MemberWorkflowState> {
	const [member] = await tx.select().from(members).where(eq(members.id, memberId)).for("update");
	if (!member) throw new Error("Workflow member was not found");
	const locations = await tx.select().from(memberLocations)
		.where(and(eq(memberLocations.memberId, memberId), locationId ? eq(memberLocations.locationId, locationId) : undefined))
		.orderBy(asc(memberLocations.locationId)).for("update");
	const state: MemberWorkflowState = { memberId, locationId, locations: new Map() };
	for (const location of locations) {
		state.locations.set(location.locationId, effectiveMemberFields(member, location.profile));
	}
	if (!locations.length) return state;
	const fields = await tx.select({
		id: memberFields.id, locationId: memberFields.locationId, value: memberCustomFields.value,
	}).from(memberFields).leftJoin(memberCustomFields, and(
		eq(memberCustomFields.customFieldId, memberFields.id),
		eq(memberCustomFields.memberId, memberId),
	)).where(inArray(memberFields.locationId, locations.map((location) => location.locationId)));
	for (const field of fields) state.locations.get(field.locationId)![`custom:${field.id}`] = field.value ?? "";
	return state;
}

/** Call after writing, in the same transaction. One event per affected location. */
export async function dispatchMemberUpdated(tx: WorkflowTransaction, before: MemberWorkflowState) {
	const after = await captureMemberWorkflowState(tx, before.memberId, before.locationId);
	for (const [locationId, oldValues] of before.locations) {
		const newValues = after.locations.get(locationId);
		if (!newValues) continue;
		const changedFields = changedMemberFields(oldValues, newValues);
		if (!changedFields.length) continue;
		await dispatchWorkflowTrigger(tx, {
			type: WorkflowEvents.member.UPDATED, memberId: before.memberId, locationId, changedFields,
		});
	}
}
