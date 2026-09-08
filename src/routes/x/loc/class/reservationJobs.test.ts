import { beforeEach, expect, mock, test } from "bun:test";
import { CheckMissedClassSchema, ClassReminderJobSchema } from "@subtrees/bullmq";
import { Elysia } from "elysia";

const now = new Date("2026-09-01T12:00:00.000Z");
let reservation = {
    id: "rsv_1",
    memberId: "member-1",
    programName: "Piano",
    startOn: new Date("2026-09-08T15:00:00.000Z"),
    endOn: new Date("2026-09-08T15:30:00.000Z"),
    status: "confirmed",
    member: { firstName: "Ava", lastName: "Chen", email: "ava@example.com" },
    location: {
        name: "Music School",
        email: "school@example.com",
        phone: null,
        address: "1 Main Street",
    },
    staff: { firstName: "Sam", lastName: "Lee" },
};
const findReservation = mock(async () => reservation);
const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: { jobId: string; delay: number; attempts: number },
) => undefined);
mock.module("@/db/db", () => ({
    db: { query: { reservations: { findFirst: findReservation } } },
}));
mock.module("@/queues/tasks", () => ({ classQueue: { add: queueAdd, getJob: mock() } }));

const { classReminderRoutes } = await import("./reminder");
const { missedClassCheckRoutes } = await import("./missed");

async function createApp(isServiceRole = true) {
    const app = new Elysia({ prefix: "/x/loc/:lid/class" })
        .derive(() => ({ isServiceRole }));
    await classReminderRoutes(app as never, () => now);
    await missedClassCheckRoutes(app as never, () => now);
    return app;
}

async function post(
    path: "reminder" | "missed",
    locationId = "location-1",
    isServiceRole = true,
) {
    const app = await createApp(isServiceRole);
    return app.handle(new Request(`http://localhost/x/loc/${locationId}/class/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reservationId: "rsv_1", locationId: "location-1" }),
    }));
}

async function remove(path: "reminder" | "missed", isServiceRole: boolean) {
    const app = await createApp(isServiceRole);
    return app.handle(new Request(
        `http://localhost/x/loc/location-1/class/${path}/rsv_1`,
        { method: "DELETE" },
    ));
}

beforeEach(() => {
    mock.clearAllMocks();
    reservation.status = "confirmed";
});

test("queues the worker reminder contract two days before class", async () => {
    const response = await post("reminder");
    const call = queueAdd.mock.calls[0];

    expect(response.status).toBe(200);
    expect(call?.[0]).toBe("reminder");
    expect(ClassReminderJobSchema.safeParse(call?.[1]).success).toBe(true);
    expect(call?.[2]).toMatchObject({
        jobId: `class:reminder:rsv_1-${reservation.startOn.getTime()}`,
        delay: 5 * 86_400_000 + 3 * 3_600_000,
    });
});

test("queues the worker missed-check contract thirty minutes after class", async () => {
    const response = await post("missed");
    const call = queueAdd.mock.calls[0];

    expect(response.status).toBe(200);
    expect(call?.[0]).toBe("missed:check");
    expect(CheckMissedClassSchema.safeParse(call?.[1]).success).toBe(true);
    expect(call?.[2]).toMatchObject({
        jobId: `class:missed:rsv_1-${reservation.endOn.getTime()}`,
        delay: 7 * 86_400_000 + 4 * 3_600_000,
    });
});

test("rejects another location before queuing", async () => {
    const response = await post("reminder", "location-2");

    expect(response.status).toBe(400);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("does not schedule jobs for a pending payment", async () => {
    reservation.status = "pending_payment";

    const response = await post("reminder");

    expect(response.status).toBe(409);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("rejects non-service reminder and missed-check scheduling", async () => {
    const reminder = await post("reminder", "location-1", false);
    const missed = await post("missed", "location-1", false);

    expect(reminder.status).toBe(403);
    expect(missed.status).toBe(403);
    expect(findReservation).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
});

test("rejects non-service reminder and missed-check deletion", async () => {
    const reminder = await remove("reminder", false);
    const missed = await remove("missed", false);

    expect(reminder.status).toBe(403);
    expect(missed.status).toBe(403);
    expect(findReservation).not.toHaveBeenCalled();
});
