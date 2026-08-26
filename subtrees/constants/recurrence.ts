export type ParsedRecurrencePattern = {
	month: number;
	day: number;
	weekday: "day" | number;
};

function integer(value: string, pattern: string) {
	if (!/^\d+$/.test(value)) {
		throw new Error(`Invalid recurrence pattern: ${pattern}`);
	}

	return Number(value);
}

function monthValue(value: string, pattern: string) {
	const month = integer(value, pattern);
	if (month > 11) throw new Error(`Invalid recurrence pattern: ${pattern}`);
	return month;
}

function dayValue(value: string, pattern: string) {
	if (value.toUpperCase() === "L") return -1;

	const day = integer(value, pattern);
	if (day === 0 || day > 31) {
		throw new Error(`Invalid recurrence pattern: ${pattern}`);
	}
	return day;
}

function weekdayValue(value: string, pattern: string) {
	if (value === "day") return "day" as const;

	const weekday = integer(value, pattern);
	if (weekday > 6) throw new Error(`Invalid recurrence pattern: ${pattern}`);
	return weekday;
}

export function parseRecurrencePattern(pattern: string): ParsedRecurrencePattern {
	const parts = pattern.split(":");
	if (parts.length !== 3) {
		throw new Error(`Invalid recurrence pattern: ${pattern}`);
	}

	const day = dayValue(parts[0]!, pattern);
	const weekday = weekdayValue(parts[1]!, pattern);
	if (weekday === "day" && day === -1) {
		throw new Error(`Invalid recurrence pattern: ${pattern}`);
	}

	return { month: monthValue(parts[2]!, pattern), day, weekday };
}

function nthWeekday(year: number, month: number, weekday: number, occurrence: number) {
	const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
	return 1 + ((weekday - firstWeekday + 7) % 7) + ((occurrence - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number) {
	const monthEnd = new Date(Date.UTC(year, month + 1, 0));
	const daysBack = (monthEnd.getUTCDay() - weekday + 7) % 7;
	return monthEnd.getUTCDate() - daysBack;
}

export function recurrenceDateKey(pattern: string, year: number) {
	const parsed = parseRecurrencePattern(pattern);
	let day = parsed.day;

	if (parsed.weekday !== "day") {
		day = parsed.day === -1
			? lastWeekday(year, parsed.month, parsed.weekday)
			: nthWeekday(year, parsed.month, parsed.weekday, parsed.day);
	}

	const date = new Date(Date.UTC(year, parsed.month, day));
	if (date.getUTCMonth() !== parsed.month) {
		throw new Error(`Invalid recurrence pattern: ${pattern}`);
	}

	return date.toISOString().slice(0, 10);
}

export function shiftDateKey(dateKey: string, days: number) {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
		throw new Error(`Invalid date key: ${dateKey}`);
	}

	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export function recurrenceDateKeys(
	pattern: string,
	startDateKey: string,
	endDateKey: string,
) {
	const startYear = Number(startDateKey.slice(0, 4));
	const endYear = Number(endDateKey.slice(0, 4));
	const dates: string[] = [];

	for (let year = startYear; year <= endYear; year += 1) {
		const date = recurrenceDateKey(pattern, year);
		if (date >= startDateKey && date <= endDateKey) dates.push(date);
	}

	return dates;
}

export function dateKeyMatchesRecurrence(dateKey: string, pattern: string) {
	return recurrenceDateKey(pattern, Number(dateKey.slice(0, 4))) === dateKey;
}
