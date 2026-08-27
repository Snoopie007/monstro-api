import { describe, expect, test } from "bun:test";
import {
	findOverlappingLocationClosure,
	type LocationClosureRow,
} from "./locationClosures";

const recurring = (
	pattern: string,
	reason: string,
): LocationClosureRow => ({
	id: `lcl_${reason}`,
	startsAt: null,
	endsAt: null,
	recurrencePattern: pattern,
	allDay: true,
	reason,
});

describe("location closure recurrence", () => {
	test.each([
		["25:day:11", "2026-12-25T18:00:00.000Z", "Christmas"],
		["4:4:10", "2026-11-26T18:00:00.000Z", "Thanksgiving"],
		["L:1:4", "2026-05-25T18:00:00.000Z", "Memorial Day"],
	])("matches %s in the location timezone", (pattern, startsAt, reason) => {
		const start = new Date(startsAt);
		const result = findOverlappingLocationClosure(
			[recurring(pattern, reason)],
			start,
			new Date(start.getTime() + 60 * 60 * 1000),
			"America/New_York",
		);

		expect(result?.reason).toBe(reason);
	});

	test("uses local midnights across the fall DST transition", () => {
		const closures = [recurring("1:day:10", "DST closure")];

		expect(findOverlappingLocationClosure(
			closures,
			new Date("2026-11-02T04:30:00.000Z"),
			new Date("2026-11-02T05:00:00.000Z"),
			"America/New_York",
		)?.reason).toBe("DST closure");

		expect(findOverlappingLocationClosure(
			closures,
			new Date("2026-11-02T05:00:00.000Z"),
			new Date("2026-11-02T06:00:00.000Z"),
			"America/New_York",
		)).toBeUndefined();
	});

	test("allows intervals adjacent to a concrete closure", () => {
		const closure: LocationClosureRow = {
			id: "lcl_concrete",
			startsAt: new Date("2026-09-01T13:00:00.000Z"),
			endsAt: new Date("2026-09-01T15:00:00.000Z"),
			recurrencePattern: null,
			allDay: false,
			reason: "Maintenance",
		};

		expect(findOverlappingLocationClosure(
			[closure],
			new Date("2026-09-01T12:00:00.000Z"),
			new Date("2026-09-01T13:00:00.000Z"),
			"UTC",
		)).toBeUndefined();
		expect(findOverlappingLocationClosure(
			[closure],
			new Date("2026-09-01T15:00:00.000Z"),
			new Date("2026-09-01T16:00:00.000Z"),
			"UTC",
		)).toBeUndefined();
	});
});
