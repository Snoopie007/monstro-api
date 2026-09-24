import type { MemberUpdatedField } from "../types/workflows/workflow";

export const MEMBER_PROFILE_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

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
