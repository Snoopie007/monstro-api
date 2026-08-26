import { recurrenceDateKey, shiftDateKey } from "@subtrees/constants/data";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type LocationClosureRow = {
	id: string;
	startsAt: Date | null;
	endsAt: Date | null;
	recurrencePattern: string | null;
	allDay: boolean;
	reason: string;
};

function concreteClosureOverlaps(
	closure: LocationClosureRow,
	startsAt: Date,
	endsAt: Date,
) {
	if (!closure.startsAt || !closure.endsAt) return false;
	return closure.startsAt < endsAt && closure.endsAt > startsAt;
}

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

export function findOverlappingLocationClosure(
	closures: LocationClosureRow[],
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
