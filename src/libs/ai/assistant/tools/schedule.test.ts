import { describe, expect, mock, test } from "bun:test";
import { sql } from "drizzle-orm";
import { executeScheduleTool } from "./schedule";
import type { ToolExecutorContext } from "./shared";

const candidate = { memberId: "member", sessionId: "session", startOnUtc: "2099-01-05T15:00:00Z" };

function fixture(confirmedBooking?: ToolExecutorContext["confirmedBooking"]) {
	const execute = mock(async () => [] as unknown[]);
	execute.mockResolvedValueOnce([{ start_utc: candidate.startOnUtc, local_dow: 1, local_time: "15:00:00" }]);
	execute.mockResolvedValueOnce([{ id: "member", first_name: "Alex", last_name: "Smith", email: "alex@example.test" }]);
	execute.mockResolvedValueOnce([{ id: "program", name: "Yoga", capacity: 10 }]);
	execute.mockResolvedValueOnce([{ id: "session", day: 1, time: "15:00:00", duration: 60, start_utc: candidate.startOnUtc, confirmed_count: 0 }]);
	const transaction = mock(async () => ({ status: "booked", reservationId: "reservation" }));
	return {
		transaction,
		run: () => executeScheduleTool({
			name: "schedule_manage", input: { action: "create" },
			context: {
				vendorId: "vendor", userId: "user", locationId: "location", threadId: "thread",
				message: "confirm", history: [], confirmationIntent: "confirm", confirmedBooking,
			},
			deps: {
				db: { execute, transaction }, sql,
				parseRangeDays: () => 1,
				buildScheduleContextText: () => "Book Alex into Yoga on January 5, 2099 at 15:00",
				parseRequestedDateTime: () => ({ year: 2099, month: 1, day: 5, hour: 15, minute: 0 }),
				getLocationTimezone: async () => "UTC",
				formatTimeHHMMSS: () => "15:00:00",
				extractMemberLookupSignals: () => ({ searchText: "Alex Smith", email: null, phoneDigits: null, tokens: [] }),
				scoreMemberCandidate: () => 1,
				formatHumanDateInTimezone: (value) => value,
			},
		}),
	};
}

describe("restored booking confirmation", () => {
	test.each([
		undefined,
		{ ...candidate, memberId: "different-member" },
		{ ...candidate, sessionId: "different-session" },
		{ ...candidate, startOnUtc: "2099-01-05T16:00:00Z" },
	])("requires confirmation again if the staged target is missing or changed: %j", async (confirmed) => {
		const { run, transaction } = fixture(confirmed);
		expect(JSON.parse((await run()).content).status).toBe("requires_confirmation");
		expect(transaction).not.toHaveBeenCalled();
	});

	test("executes the existing booking transaction only for the confirmed target", async () => {
		const { run, transaction } = fixture(candidate);
		expect(JSON.parse((await run()).content).status).toBe("booked");
		expect(transaction).toHaveBeenCalledTimes(1);
	});
});
