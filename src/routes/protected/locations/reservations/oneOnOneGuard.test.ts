import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const findSession = mock(async () => ({
    id: "session-1",
    program: { locationId: "location-1", sessionMode: "one_on_one" },
}));
const findCurrentSession = mock(async () => ({ id: "session-1", program: { locationId: "location-1", sessionMode: "group" } }));
const insert = mock(() => ({ values: () => ({ returning: async () => [{ id: "rsv_1" }] }) }));
const update = mock(() => ({ set: () => ({ where: async () => undefined }) }));
const findReservation = mock(async () => ({ id: "rsv_1", program: { sessionMode: "one_on_one" } }));
const tx = { execute: mock(async () => undefined), query: { programSessions: { findFirst: findCurrentSession } }, insert, update };
mock.module("@/db/db", () => ({
    db: {
        query: {
            reservations: { findFirst: findReservation },
            programSessions: { findFirst: findSession },
            memberPackages: { findFirst: async () => ({ memberId: "member-1", totalClassLimit: 10, totalClassAttended: 0 }) },
            memberLocations: { findFirst: async () => ({ onboarded: true, member: { id: "member-1" }, location: {} }) },
        },
        transaction: async (callback: (tx: unknown) => unknown) => callback(tx),
    },
}));
mock.module("./utils", () => ({
    getSessionState: async () => ({ isFull: false, isReserved: false }),
    checkSubClassCredits: async () => false,
}));
mock.module("@/utils/triggers", () => ({ triggerFirstBooking: mock() }));
mock.module("@/libs/broadcast", () => ({ broadcastAchievement: mock() }));
mock.module("@/queues", () => ({ classQueue: { add: mock() } }));

const { locationReservations } = await import("./root");

beforeEach(() => {
    insert.mockClear();
    update.mockClear();
    findSession.mockResolvedValue({ id: "session-1", program: { locationId: "location-1", sessionMode: "one_on_one" } });
    findCurrentSession.mockResolvedValue({ id: "session-1", program: { locationId: "location-1", sessionMode: "group" } });
});

async function book() {
    const app = new Elysia({ prefix: "/protected/locations/:lid" });
    await locationReservations(app as never);
    return app.handle(new Request(
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
}

test("rejects 1-on-1 sessions from the generic reservation route", async () => {
    const response = await book();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
        success: false,
        message: "Book 1-on-1 reservations from the vendor calendar.",
    });
});

test.each(["DELETE", "PATCH"])("rejects legacy %s before modifying a 1-on-1 reservation", async (method) => {
    const app = new Elysia({ prefix: "/protected/locations/:lid" });
    await locationReservations(app as never);
    const suffix = method === "PATCH" ? "/resume" : "";
    const response = await app.handle(new Request(`http://localhost/protected/locations/location-1/reservations/rsv_1${suffix}`, { method }));
    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
});

test("rejects a mode change during booking without a reservation or package increment", async () => {
    findSession.mockResolvedValue({ id: "session-1", program: { locationId: "location-1", sessionMode: "group" } });
    findCurrentSession.mockResolvedValue({ id: "session-1", program: { locationId: "location-1", sessionMode: "one_on_one" } });
    const response = await book();
    expect(response.status).toBe(409);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
});

test("keeps ordinary group booking working when the mode is unchanged", async () => {
    findSession.mockResolvedValue({ id: "session-1", program: { locationId: "location-1", sessionMode: "group" } });
    const response = await book();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
});
