import { expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const findSession = mock(async () => ({
    id: "session-1",
    program: { locationId: "location-1", sessionMode: "one_on_one" },
}));
mock.module("@/db/db", () => ({
    db: { query: { programSessions: { findFirst: findSession } } },
}));
mock.module("@/utils/triggers", () => ({ triggerFirstBooking: mock() }));
mock.module("@/libs/broadcast", () => ({ broadcastAchievement: mock() }));
mock.module("@/queues", () => ({ classQueue: { add: mock() } }));

const { locationReservations } = await import("./root");

test("rejects 1-on-1 sessions from the generic reservation route", async () => {
    const app = new Elysia({ prefix: "/protected/locations/:lid" });
    await locationReservations(app as never);
    const response = await app.handle(new Request(
        "http://localhost/protected/locations/location-1/reservations",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                plan: { id: "plan-1", classLimitInterval: null, totalClassLimit: null },
                session: {
                    id: "session-1",
                    capacity: 1,
                    programName: "Piano",
                    programId: "program-1",
                    utcStartTime: "2030-01-03T20:00:00.000Z",
                    utcEndTime: "2030-01-03T20:30:00.000Z",
                    staffId: "staff-1",
                },
                memberPlanId: "pkg_1",
            }),
        },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
        success: false,
        message: "Book 1-on-1 reservations from the vendor calendar.",
    });
});
