import type { MemberUpdatedField } from "../types/workflows/workflow";

export const MEMBER_PROFILE_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

/** Used by the action form and worker so saved values obey the same field rules. */
export function customFieldValueError(
	field: { type: string; options?: { value: string }[] | null },
	value: string,
): string | undefined {
	if (value.length > 10000) return "Use at most 10,000 characters";
	if (!["text", "number", "date", "boolean", "select", "multi-select"].includes(field.type)) {
		return "This field type is not supported";
	}
	// Clearing is allowed for every supported field type.
	if (value === "") return;
	switch (field.type) {
		case "number":
			if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) || !Number.isFinite(Number(value))) return "Enter a valid number";
			break;
		case "boolean":
			if (value !== "true" && value !== "false") return "Choose Yes or No";
			break;
		case "date": {
			// Accept the calendar's ISO timestamp or a date-only value, not ambiguous dates.
			const date = new Date(value);
			if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/.test(value)
				|| !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10)) return "Enter a valid date";
			break;
		}
		case "select":
			if (!field.options?.some((option) => option.value === value)) return "Choose an available option";
			break;
		case "multi-select":
			if (!value.split(",").every((item) => field.options?.some((option) => option.value === item))) return "Choose available options only";
			break;
	}
}

/** Missing configuration means this trigger has not been configured yet. */
export function parseMemberUpdatedFields(value: unknown): MemberUpdatedField[] | null {
	if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
	if (!value.every((field) => typeof field === "string"
		&& (MEMBER_PROFILE_FIELDS.some((key) => key === field) || /^custom:[A-Za-z0-9_-]+$/.test(field)))) return null;
	return [...new Set(value)] as MemberUpdatedField[];
}

/** Match the worker's per-field override rules, including intentionally empty strings. */
export function effectiveMemberFields(
	member: Record<string, unknown>,
	profile: unknown,
): Record<string, string> {
	const overrides = profile && typeof profile === "object" && !Array.isArray(profile)
		? profile as Record<string, unknown> : {};
	return Object.fromEntries(MEMBER_PROFILE_FIELDS.map((field) => [
		field,
		typeof overrides[field] === "string" ? overrides[field] : member[field] ?? "",
	])) as Record<string, string>;
}

/** Compare final values, not merely the presence of a field in the request. */
export function changedMemberFields(before: Record<string, string>, after: Record<string, string>): MemberUpdatedField[] {
	return [...new Set([...Object.keys(before), ...Object.keys(after)])]
		.filter((key) => (before[key] ?? "") !== (after[key] ?? "")) as MemberUpdatedField[];
}
