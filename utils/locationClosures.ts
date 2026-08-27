import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { recurrenceDateKey, shiftDateKey } from "../constants/recurrence";
import { type LocationClosure } from "../types";

/**
 * Checks a one-time closure against a requested session window.
 *
 * The comparison treats both windows as `[start, end)`. A session may start
 * when a closure ends, or end when a closure starts, without being blocked.
 */
function concreteClosureOverlaps(
	closure: LocationClosure,
	startsAt: Date,
	endsAt: Date,
) {
	if (!closure.startsAt || !closure.endsAt) return false;
	return closure.startsAt < endsAt && closure.endsAt > startsAt;
}

/**
 * Expands a yearly recurrence pattern only for the local years touched by the
 * requested window, then checks the resulting all-day closure.
 *
 * Local midnights are converted to UTC after the date is resolved. This keeps
 * the closure on the location's calendar date when daylight-saving offsets
 * change.
 */
function recurringClosureOverlaps(
	pattern: string,
	timezone: string,
	startsAt: Date,
	endsAt: Date,
) {
	if (endsAt <= startsAt) return false;

	const firstYear = Number(formatInTimeZone(startsAt, timezone, "yyyy"));
	const lastInstant = new Date(endsAt.getTime() - 1);
	const lastYear = Number(formatInTimeZone(lastInstant, timezone, "yyyy"));

	for (let year = firstYear; year <= lastYear; year += 1) {
		const date = recurrenceDateKey(pattern, year);
		const occurrenceStart = fromZonedTime(`${date}T00:00:00`, timezone);
		const occurrenceEnd = fromZonedTime(`${shiftDateKey(date, 1)}T00:00:00`, timezone);
		if (occurrenceStart < endsAt && occurrenceEnd > startsAt) return true;
	}

	return false;
}

/**
 * Finds the closure that affects a scheduled session window.
 *
 * The public schedule route uses the result to mark the session as blocked. The
 * location-session and staff-program routes use its reason as the holiday name
 * shown with the session. One-time closures are checked first so their specific
 * reason wins when they overlap a recurring holiday.
 */
export function findOverlappingLocationClosure(
	closures: LocationClosure[],
	startsAt: Date,
	endsAt: Date,
	timezone: string,
) {
	const concrete = closures.find((closure) => (
		!closure.recurrencePattern
		&& concreteClosureOverlaps(closure, startsAt, endsAt)
	));
	if (concrete) return concrete;

	return closures.find((closure) => (
		closure.recurrencePattern
		&& recurringClosureOverlaps(
			closure.recurrencePattern,
			timezone,
			startsAt,
			endsAt,
		)
	));
}
