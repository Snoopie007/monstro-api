import { describe, expect, test } from "bun:test";
import {
    buildClassReminderJob,
    buildMissedClassJob,
    singleNextDelay,
    singleNextJobId,
} from "./types";

const now = new Date("2026-09-01T12:00:00.000Z");
const nextJob = {
    previousReservationId: "rsv_1",
    sessionId: "session-1",
    locationId: "location-1",
    memberId: "member-1",
    nextStartOn: "2026-09-08T15:00:00.000Z",
    planType: { type: "package", id: "package-1" },
    snapshot: {
        programId: "program-1",
        programName: "Piano",
        staffId: "staff-1",
        sessionDay: 2,
        sessionTime: "11:00:00",
        duration: 30,
        timezone: "America/New_York",
    },
};

const missedData = {
    rid: "rsv_1",
    lid: "location-1",
    mid: "member-1",
    member: { firstName: "Ava", lastName: "Chen", email: "ava@example.com" },
    location: {
        name: "Music School",
        email: "school@example.com",
        phone: null,
        address: "1 Main Street",
    },
    class: {
        name: "Piano",
        startTime: new Date("2026-09-08T15:00:00.000Z"),
        endTime: new Date("2026-09-08T15:30:00.000Z"),
    },
};

describe("reservation queue jobs", () => {
    test("builds a BullMQ-safe single-next ID and two-day delay", () => {
        const jobId = singleNextJobId(nextJob);

        expect(jobId).toBe(
            `single:next:session-1-member-1-package-1-${Date.parse(nextJob.nextStartOn)}`,
        );
        expect(jobId.split(":")).toHaveLength(3);
        expect(singleNextDelay(nextJob.nextStartOn, now)).toBe(5 * 86_400_000 + 3 * 3_600_000);
    });

    test("builds the worker's reminder and missed-check contracts", () => {
        const { mid: _memberId, ...reminderData } = missedData;
        const reminder = buildClassReminderJob(reminderData, now);
        const missed = buildMissedClassJob(missedData, now);

        expect(reminder).toMatchObject({
            name: "reminder",
            data: { rid: "rsv_1", lid: "location-1" },
            opts: { delay: 5 * 86_400_000 + 3 * 3_600_000 },
        });
        expect(missed).toMatchObject({
            name: "missed:check",
            data: { rid: "rsv_1", lid: "location-1", mid: "member-1" },
            opts: { delay: 7 * 86_400_000 + 4 * 3_600_000 },
        });
    });
});
