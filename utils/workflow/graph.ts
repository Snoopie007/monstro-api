import { z } from "zod";

/** The JSON shape stored inside a workflow run's frozen node snapshot. */
export const WorkflowNodeShape = z.object({
	 id: z.string().min(1),
	 type: z.string().min(1),
	 parentId: z.string().min(1).optional(),
	 data: z.unknown().optional(),
}).passthrough();

export type WorkflowRuntimeNode = z.infer<typeof WorkflowNodeShape>;

export type WorkflowGraph = {
	nodes: WorkflowRuntimeNode[];
	byId: Map<string, WorkflowRuntimeNode>;
};

/**
 * Validate persisted graph integrity once per run. The worker deliberately
 * does not require a particular action sequence: more handlers can be added
 * without changing this validator. Each handler still validates its own data.
 */
export function validateWorkflowGraph(value: unknown):
	| { ok: true; graph: WorkflowGraph }
	| { ok: false; error: string } {
	const parsed = z.array(WorkflowNodeShape).min(1).safeParse(value);
	if (!parsed.success) return { ok: false, error: "Workflow node snapshot is invalid" };

	const nodes = parsed.data;
	const byId = new Map<string, WorkflowRuntimeNode>();
	for (const node of nodes) {
		if (byId.has(node.id)) return { ok: false, error: `Duplicate workflow node ID: ${node.id}` };
		byId.set(node.id, node);
	}

	const startNodes = nodes.filter((node) => node.type === "start");
	const starts = startNodes.filter((node) => node.parentId === undefined);
	if (startNodes.length !== 1 || starts.length !== 1 || starts[0]?.id !== "start") {
		return { ok: false, error: "Workflow must have one canonical unparented start node" };
	}

	for (const node of nodes) {
		if (node.parentId && !byId.has(node.parentId)) {
			return { ok: false, error: `Workflow node ${node.id} references missing parent ${node.parentId}` };
		}
	}
	for (const node of nodes) {
		if (node.type === "end" && nodes.some((child) => child.parentId === node.id)) {
			return { ok: false, error: `End node ${node.id} cannot have outgoing nodes` };
		}
	}

	const children = new Map<string, WorkflowRuntimeNode[]>();
	for (const node of nodes) {
		if (!node.parentId) continue;
		const current = children.get(node.parentId) ?? [];
		current.push(node);
		children.set(node.parentId, current);
	}

	const visiting = new Set<string>();
	const visited = new Set<string>();
	const visit = (node: WorkflowRuntimeNode): string | undefined => {
		if (visiting.has(node.id)) return `Workflow graph contains a cycle at ${node.id}`;
		if (visited.has(node.id)) return undefined;
		visiting.add(node.id);
		for (const child of children.get(node.id) ?? []) {
			const error = visit(child);
			if (error) return error;
		}
		visiting.delete(node.id);
		visited.add(node.id);
		return undefined;
	};

	const cycleError = visit(starts[0]!);
	if (cycleError) return { ok: false, error: cycleError };
	if (visited.size !== nodes.length) return { ok: false, error: "Workflow graph contains disconnected nodes" };

	return { ok: true, graph: { nodes, byId } };
}

export function getNextNodes(graph: WorkflowGraph, nodeId: string) {
	return graph.nodes.filter((node) => node.parentId === nodeId);
}

/**
 * Start and email steps each need exactly one successor. Share this check so
 * both handlers reject missing or ambiguous paths with the same message.
 * Condition handlers will choose their own branch when they are implemented.
 */
export function getSingleNextNode(graph: WorkflowGraph, nodeId: string):
	| { ok: true; node: WorkflowRuntimeNode }
	| { ok: false; error: string } {
	const next = getNextNodes(graph, nodeId);
	if (next.length !== 1) {
		return {
			ok: false,
			error: next.length === 0
				? `Workflow node ${nodeId} has no next node`
				: `Workflow node ${nodeId} has ambiguous next nodes`,
		};
	}
	return { ok: true, node: next[0]! };
}
