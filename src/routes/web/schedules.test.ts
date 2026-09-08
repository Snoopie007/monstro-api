import { expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

mock.module("@/db/db", () => ({
    db: {
        query: {
            locations: {
                findFirst: mock(async () => ({
                    timezone: "America/Los_Angeles",
                    locationState: { status: "active" },
                })),
            },
            programs: {
                findMany: mock(async () => [{
                    id: "private-lessons",
                    name: "Private Lessons",
                    description: "",
                    minAge: 2,
                    maxAge: 99,
                    sessions: Array.from({ length: 7 }, (_, index) => ({
                        id: `day-${index + 1}`,
                        day: index + 1,
                        time: "17:00:00",
                        duration: 240,
                    })),
                }]),
            },
            locationClosures: { findMany: mock(async () => []) },
        },
    },
}));
mock.module("@/middlewares/WebAuthMW", () => ({
    WebAuthMiddleware: (app: Elysia) => app.resolve(() => ({ lid: "location-1" })),
}));

const { getLocationSchedules } = await import("./schedules");

test.each([
    ["2026-09-06", "2026-09-06"],
    ["2026-09-08", "2026-09-06"],
    ["2026-09-01", "2026-08-30"],
])("keeps every weekday in the requested week for %s", async (date, sunday) => {
    const result = await getLocationSchedules("location-1", date);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("Expected an active location schedule");

    expect(result.sessions).toHaveLength(7);
    expect(result.weekStart.toISOString()).toBe(`${sunday}T00:00:00.000Z`);

    for (const [offset, session] of result.sessions.entries()) {
        const expectedDay = new Date(`${sunday}T17:00:00.000Z`);
        expectedDay.setUTCDate(expectedDay.getUTCDate() + offset);
        expect(session.id).toBe(`private-lessons-day-${offset === 0 ? 7 : offset}`);
        expect(session.day).toEqual(expectedDay);
        expect(session.day.getTime()).toBeGreaterThanOrEqual(result.weekStart.getTime());
        expect(session.day.getTime()).toBeLessThanOrEqual(result.weekEnd.getTime());
        // 5–9 PM in Los Angeles crosses midnight in UTC, but stays on its local day.
        expect(session.utcStartTime.getTime()).toBe(expectedDay.getTime() + 7 * 60 * 60_000);
        expect(session.utcEndTime.getTime() - session.utcStartTime.getTime()).toBe(240 * 60_000);
    }
});
