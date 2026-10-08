/** Shared allowlist for Conditions and message mentions. No database code here. */
export const workflowVariables = {
	"trigger.type": { label: "Trigger type", type: "string", source: "snapshot", options: "triggers" },
	"rank.fromRankId": { label: "Previous rank", type: "string", source: "snapshot", trigger: "rank::changed", options: "ranks" },
	"rank.toRankId": { label: "New rank", type: "string", source: "snapshot", trigger: "rank::changed", options: "ranks" },
	"rank.processId": { label: "Rank process", type: "string", source: "snapshot", trigger: "rank::changed", options: "rankProcesses" },
	"memberUpdated.changedFields": { label: "Changed member fields", type: "list", source: "snapshot", trigger: "member::updated", options: "changedFields" },
	"registration.eventId": { label: "Registered event", type: "string", source: "snapshot", trigger: "event::registered", options: "events" },
	"order.status": { label: "Current order status", type: "string", source: "order", trigger: "order::created", options: "orderStatuses" },
	"payment.paymentType": { label: "Current payment method", type: "string", source: "payment", trigger: "payment::failed", options: "paymentTypes" },
	"payment.failedCode": { label: "Current payment failure code", type: "string", source: "payment", trigger: "payment::failed" },
	"registration.ticketId": { label: "Current registration ticket", type: "string", source: "registration", trigger: "event::registered", options: "tickets" },
	"registration.status": { label: "Current registration status", type: "string", source: "registration", trigger: "event::registered", options: "registrationStatuses" },
	"attendance.programId": { label: "Attendance program", type: "string", source: "attendance", trigger: "attendance::recorded", options: "programs" },
	"reservation.programId": { label: "Missed class program", type: "string", source: "reservation", trigger: "class::missed", options: "programs" },
	"member.firstName": { label: "Member first name", type: "string", source: "member" },
	"member.lastName": { label: "Member last name", type: "string", source: "member" },
	"location.name": { label: "Location name", type: "string", source: "location" },
} as const;

export type WorkflowVariableKey = keyof typeof workflowVariables;
export type VariableType = "string" | "number" | "boolean" | "list";
export type ConditionVariable =
	| { source: "customField"; fieldId: string }
	| { source: "context"; key: WorkflowVariableKey };
export type VariableDefinition = { label: string; type: VariableType; source: string; trigger?: string; options?: string };
export type ResolvedVariable = { name: string; type: string; value: string | string[]; text: string; available: boolean };
export class WorkflowVariableError extends Error {}
export type VariableChoice = { value: string; label: string };
export type VariableChoices = Record<string, VariableChoice[]>;
export const staticVariableChoices: VariableChoices = Object.fromEntries(Object.entries({
	orderStatuses: ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"],
	registrationStatuses: ["pending", "registered", "cancelled", "attended"],
	paymentTypes: ["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay", "link", "cashapp"],
}).map(([key, values]) => [key, values.map(value => ({ value, label: value.replaceAll("_", " ") }))]));

export function variableDefinition(key: string): VariableDefinition | undefined {
	return Object.hasOwn(workflowVariables, key) ? workflowVariables[key as WorkflowVariableKey] : undefined;
}

export function customFieldId(key: string): string | undefined {
	return /^custom\.[A-Za-z0-9_-]+$/.test(key) ? key.slice(7) : undefined;
}

export type VariableToken = { raw: string; key: string; fallback?: string };

/** Fallback is literal text: {{rank.toRankId|your new rank}}. Never evaluate it. */
export function templateVariables(template: string): VariableToken[] {
	const tokens: VariableToken[] = [];
	const rest = template.replace(/\{\{([^{}]+)\}\}/g, (raw, content: string) => {
		const separator = content.indexOf("|");
		const key = (separator < 0 ? content : content.slice(0, separator)).trim();
		if (!variableDefinition(key) && !customFieldId(key)) throw new WorkflowVariableError(`Unknown workflow variable: ${key}`);
		tokens.push({ raw, key, ...(separator < 0 ? {} : { fallback: content.slice(separator + 1) }) });
		return "";
	});
	if (rest.includes("{{") || rest.includes("}}")) throw new WorkflowVariableError("Malformed workflow variable. Fallback text cannot contain braces.");
	return tokens;
}

export function renderVariableTemplate(template: string, values: Map<string, ResolvedVariable>, escape: (value: string) => string = value => value) {
	const tokens = templateVariables(template);
	let index = 0;
	return template.replace(/\{\{([^{}]+)\}\}/g, () => {
		const token = tokens[index++]!;
		const resolved = values.get(token.key);
		if (!resolved) throw new WorkflowVariableError(`Variable was not resolved: ${token.key}`);
		if (!resolved.available && token.fallback === undefined) throw new WorkflowVariableError(`Variable needs fallback text: ${token.key}`);
		return escape(!resolved.available || resolved.text === "" ? token.fallback ?? resolved.text : resolved.text);
	});
}
