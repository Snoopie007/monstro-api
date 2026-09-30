import type { WorkflowGraph, WorkflowRuntimeNode } from "./graph";
import { variableDefinition, type ConditionVariable } from "./variables";

export type ConditionType = "string" | "number" | "boolean" | "list";

export type ConditionPath = {
	pathId: string;
	isDefault: boolean;
	fieldId?: string;
	variable?: ConditionVariable;
	operator?: string;
	value?: string;
	type?: string;
};

const NUMBER_OPERATORS = new Set([">", "<", "=", ">=", "<="]);
const STRING_OPERATORS = new Set([
	"is",
	"is not",
	"contains",
	"does not contain",
	"starts with",
	"ends with",
	"is empty",
	"is not empty",
]);
const BOOLEAN_OPERATORS = new Set(["true", "false"]);
const LIST_OPERATORS = new Set(["includes", "does not include"]);

/** Keep fieldId-only saved paths readable. New paths use a variable reference. */
export function conditionVariableKey(path: ConditionPath): string {
	if (path.variable && path.fieldId) throw new Error("Choose either a variable or a legacy custom field, not both");
	if (!path.variable) {
		if (!path.fieldId?.trim()) throw new Error("Choose a condition variable");
		return `custom.${path.fieldId}`;
	}
	if (path.variable.source === "customField" && /^[A-Za-z0-9_-]+$/.test(path.variable.fieldId)) return `custom.${path.variable.fieldId}`;
	if (path.variable.source === "context" && variableDefinition(path.variable.key)) return path.variable.key;
	throw new Error("Unknown condition variable");
}

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function validateConditionPaths(node: WorkflowRuntimeNode, graph: WorkflowGraph):
	| { ok: true; defaultPath: ConditionPath; checks: ConditionPath[] }
	| { ok: false; error: string } {
	const data = record(node.data);
	if (!Array.isArray(data.paths) || data.paths.length === 0) {
		return { ok: false, error: "Workflow condition must define at least one path" };
	}

	const paths: ConditionPath[] = [];
	const ids = new Set<string>();
	for (const [index, value] of data.paths.entries()) {
		const path = record(value) as ConditionPath;
		if (typeof path.pathId !== "string" || !path.pathId) {
			return { ok: false, error: `Workflow condition path ${index + 1} has no path ID` };
		}
		if (ids.has(path.pathId)) {
			return { ok: false, error: `Workflow condition repeats path ${path.pathId}` };
		}
		ids.add(path.pathId);
		const pathNode = graph.byId.get(path.pathId);
		if (!pathNode || pathNode.parentId !== node.id || pathNode.type !== "path") {
			return { ok: false, error: `Workflow condition path ${path.pathId} is not a direct path node` };
		}
		if (typeof path.isDefault !== "boolean") {
			return { ok: false, error: `Workflow condition path ${path.pathId} must declare isDefault` };
		}
		paths.push(path);
	}

	const children = graph.nodes.filter((candidate) => candidate.parentId === node.id);
	if (children.length !== paths.length) {
		return { ok: false, error: "Workflow condition paths do not match its direct path nodes" };
	}

	const defaults = paths.filter((path) => path.isDefault);
	if (defaults.length !== 1) {
		return { ok: false, error: "Workflow condition must define exactly one default path" };
	}

	const checks = paths.filter((path) => !path.isDefault);
	for (const path of checks) {
		try {
			const definition = variableDefinition(conditionVariableKey(path));
			if (definition && definition.type !== path.type) throw new Error("Condition variable type does not match");
		} catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Invalid condition variable" }; }
		if (typeof path.operator !== "string" || !path.operator) {
			return { ok: false, error: `Workflow condition path ${path.pathId} needs an operator` };
		}
		if (!["string", "number", "boolean", "list"].includes(path.type ?? "")) {
			return { ok: false, error: `Workflow condition path ${path.pathId} has an unsupported type` };
		}
		if (path.type !== "boolean" && !["is empty", "is not empty"].includes(path.operator) && typeof path.value !== "string") {
			return { ok: false, error: `Workflow condition path ${path.pathId} needs a comparison value` };
		}
		if (path.type === "number" && typeof path.value === "string" && path.operator !== "is empty" && path.operator !== "is not empty") {
			if (!path.value.trim() || !Number.isFinite(Number(path.value))) {
				return { ok: false, error: `Workflow condition path ${path.pathId} needs a valid number` };
			}
		}
		const operators = path.type === "number" ? NUMBER_OPERATORS : path.type === "boolean" ? BOOLEAN_OPERATORS : path.type === "list" ? LIST_OPERATORS : STRING_OPERATORS;
		if (!operators.has(path.operator)) {
			return { ok: false, error: `Workflow condition path ${path.pathId} does not support operator ${path.operator}` };
		}
	}

	return { ok: true, defaultPath: defaults[0]!, checks };
}

export function fieldConditionType(type: string): ConditionType | undefined {
	if (type === "number") return "number";
	if (type === "boolean") return "boolean";
	if (["text", "date", "select", "multi-select"].includes(type)) return "string";
	return undefined;
}
