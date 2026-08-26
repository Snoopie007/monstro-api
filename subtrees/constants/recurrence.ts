/**
 * Parsed form of the holiday pattern `<day>:<weekday>:<month>`.
 *
 * Months use JavaScript's zero-based numbering, where January is `0` and
 * December is `11`. A weekday is either `day` for a fixed calendar date or a
 * number from `0` Sunday through `6` Saturday. For weekday patterns, `day` is
 * the occurrence within the month or `L` for the last matching weekday.
 *
 * Examples: `25:day:11` is December 25, `4:4:10` is the fourth Thursday in
 * November, and `L:1:4` is the last Monday in May.
 */
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

/** Validates a stored holiday pattern and converts its parts to numbers. */
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

/**
 * Resolves one yearly pattern to a `YYYY-MM-DD` calendar key.
 *
 * UTC is used only for calendar arithmetic. The result is not a UTC instant.
 * Callers convert local midnight for this date with the location timezone.
 */
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

/** Adds whole calendar days to a `YYYY-MM-DD` key without using the host timezone. */
export function shiftDateKey(dateKey: string, days: number) {
	const date = new Date(`${dateKey}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
		throw new Error(`Invalid date key: ${dateKey}`);
	}

	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** Returns every yearly occurrence inside the inclusive date-key range. */
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

/** Checks whether a date key is the occurrence of a pattern in that year. */
export function dateKeyMatchesRecurrence(dateKey: string, pattern: string) {
	return recurrenceDateKey(pattern, Number(dateKey.slice(0, 4))) === dateKey;
}
