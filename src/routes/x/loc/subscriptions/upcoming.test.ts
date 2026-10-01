import { beforeEach, expect, mock, test } from "bun:test";

const getJobSchedulers = mock(async (): Promise<any[]> => []);
const getJobs = mock(async (_states: string[]): Promise<any[]> => []);
mock.module("@/queues/subscriptions", () => ({
    subQueue: { getJobSchedulers, getJobs },
}));
mock.module("@/db/db", () => ({ db: {} }));
const { loadSchedules } = await import("./upcoming");

beforeEach(() => {
    getJobSchedulers.mockReset().mockResolvedValue([]);
    getJobs.mockReset().mockResolvedValue([]);
});

test("an old failed job cannot hide a recovered renewal schedule", async () => {
    const job = {
        data: {
            sid: "sub",
            expectedDueAt: "2026-10-08T12:00:00Z",
            recurrenceCount: 4,
        },
    };
    const oldFailure = {
        data: {
            sid: "sub",
            expectedDueAt: "2026-09-08T12:00:00Z",
            recurrenceCount: 3,
        },
    };
    getJobs.mockImplementation(async (states) =>
        states.includes("failed") ? [oldFailure] : [job],
    );
    const schedules = await loadSchedules(new Set(["sub"]));
    expect(schedules.get("sub")).toMatchObject({
        dueAt: new Date("2026-10-08T12:00:00Z"),
        cycleCount: 4,
        blocked: false,
    });
});

test("keeps the real static cron cadence and ignores another location's subscription", async () => {
    getJobSchedulers.mockResolvedValue([
        {
            template: { data: { sid: "sub" } },
            next: Date.parse("2026-10-08T12:00:00Z"),
            pattern: "0 12 8 * *",
            iterationCount: 3,
        },
        {
            template: { data: { sid: "other" } },
            next: Date.parse("2026-10-02T12:00:00Z"),
        },
    ]);
    const schedules = await loadSchedules(new Set(["sub"]));
    expect(schedules.size).toBe(1);
    expect(schedules.get("sub")?.cycleCount).toBe(4);
    expect(
        schedules.get("sub")?.nextDueAt?.(new Date("2026-10-08T12:00:00Z")),
    ).toEqual(new Date("2026-11-08T12:00:00Z"));
});
