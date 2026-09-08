import { beforeEach, expect, mock, test } from "bun:test";
import {
    SINGLE_NEXT_JOB,
    SingleNextJobSchema,
    singleNextDelay,
    singleNextJobId,
} from "@subtrees/bullmq";
import { Elysia } from "elysia";

const now = new Date("2026-09-01T12:00:00.000Z");
const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: { jobId: string; delay: number; attempts: number; removeOnComplete: boolean },
) => ({ id: "single-next-job" }));
const changeDelay = mock(async (_delay: number) => undefined);
let jobState = "delayed";
const getState = mock(async () => jobState);
let queuedJob: {
    name: string;
    data: unknown;
    changeDelay: typeof changeDelay;
    getState: typeof getState;
} | undefined;
const getJob = mock(async (_jobId: string) => queuedJob);
let activePointer = "";
const findSession = mock(async () => ({
    nextReservationJobId: activePointer,
    program: { locationId: "location-1" },
}));
mock.module("@/queues/tasks", () => ({ classQueue: { add: queueAdd, getJob } }));
mock.module("@/db/db", () => ({
    db: { query: { programSessions: { findFirst: findSession } } },
}));

const { singleNextRoutes } = await import("./single");

const payload = {
    previousReservationId: "rsv_1",
    sessionId: "session-1",
    locationId: "location-1",
    memberId: "member-1",
    nextStartOn: "2026-09-08T15:00:00.000Z",
    planType: { type: "package" as const, id: "package-1" },
    snapshot: {
        programId: "program-1",
        programName: "Piano",
        staffId: "staff-1",
        sessionDay: 2,
        sessionTime: "15:00:00",
        duration: 30,
        timezone: "America/New_York",
    },
};

async function createApp(isServiceRole = true) {
    const base = new Elysia({ prefix: "/x/loc/:lid/class" })
        .derive(() => ({ isServiceRole }));
    return singleNextRoutes(base as never, () => now);
}

async function post(body: unknown, locationId = "location-1", path = "single/next", service = true) {
    const app = await createApp(service);
    return app.handle(new Request(`http://localhost/x/loc/${locationId}/class/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    }));
}

beforeEach(() => {
    mock.clearAllMocks();
    activePointer = singleNextJobId(payload);
    jobState = "delayed";
    changeDelay.mockImplementation(async (delay) => {
        if (delay === 0) jobState = "waiting";
    });
    queuedJob = { name: SINGLE_NEXT_JOB, data: payload, changeDelay, getState };
});

test("queues the next 1-on-1 reservation", async () => {
    const response = await post(payload);

    expect(response.status).toBe(200);
    expect(SingleNextJobSchema.safeParse(queueAdd.mock.calls[0]?.[1]).success).toBe(true);
    expect(queueAdd).toHaveBeenCalledWith(SINGLE_NEXT_JOB, payload, {
        jobId: singleNextJobId(payload),
        delay: singleNextDelay(payload.nextStartOn, now),
        attempts: 3,
        removeOnComplete: true,
    });
});

test("rejects non-service callers", async () => {
    const response = await post(payload, "location-1", "single/next", false);

    expect(response.status).toBe(403);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("rejects a location mismatch", async () => {
    const response = await post(payload, "location-2");

    expect(response.status).toBe(400);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("rejects an invalid job payload", async () => {
    const response = await post({ ...payload, planType: { type: "none" } });

    expect(response.status).toBe(400);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("reschedules the matching tenant job and clamps a near move to zero", async () => {
    const body = {
        jobId: singleNextJobId(payload),
        sessionId: payload.sessionId,
        originalDate: "2026-09-08",
        startsAt: "2026-09-02T12:00:00.000Z",
    };

    const first = await post(body, "location-1", "single/reschedule");
    const second = await post(body, "location-1", "single/reschedule");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(changeDelay).toHaveBeenCalledTimes(1);
    expect(changeDelay).toHaveBeenCalledWith(0);
});

test("does not reschedule a job from another location", async () => {
    queuedJob = {
        name: SINGLE_NEXT_JOB,
        data: { ...payload, locationId: "location-2" },
        changeDelay,
        getState,
    };
    const response = await post({
        jobId: singleNextJobId(payload),
        sessionId: payload.sessionId,
        originalDate: "2026-09-08",
        startsAt: "2026-09-08T15:00:00.000Z",
    }, "location-1", "single/reschedule");

    expect(response.status).toBe(404);
    expect(changeDelay).not.toHaveBeenCalled();
});

test("does not reschedule another queue job type", async () => {
    queuedJob = { name: "reminder", data: payload, changeDelay, getState };
    const response = await post({
        jobId: singleNextJobId(payload),
        sessionId: payload.sessionId,
        originalDate: "2026-09-08",
        startsAt: "2026-09-08T15:00:00.000Z",
    }, "location-1", "single/reschedule");

    expect(response.status).toBe(404);
    expect(changeDelay).not.toHaveBeenCalled();
});

test("does not reschedule a job for another session", async () => {
    const response = await post({
        jobId: singleNextJobId(payload),
        sessionId: "session-2",
        originalDate: "2026-09-08",
        startsAt: "2026-09-08T15:00:00.000Z",
    }, "location-1", "single/reschedule");

    expect(response.status).toBe(404);
    expect(findSession).not.toHaveBeenCalled();
    expect(changeDelay).not.toHaveBeenCalled();
});

test("rejects a future move for a different occurrence", async () => {
    const response = await post({
        jobId: singleNextJobId(payload),
        sessionId: payload.sessionId,
        originalDate: "2026-09-15",
        startsAt: "2026-09-15T15:00:00.000Z",
    }, "location-1", "single/reschedule");

    expect(response.status).toBe(409);
    expect(findSession).not.toHaveBeenCalled();
    expect(changeDelay).not.toHaveBeenCalled();
});

test("does not reschedule a stale session pointer", async () => {
    activePointer = "single:next:new-generation";
    const response = await post({
        jobId: singleNextJobId(payload),
        sessionId: payload.sessionId,
        originalDate: "2026-09-08",
        startsAt: "2026-09-08T15:00:00.000Z",
    }, "location-1", "single/reschedule");

    expect(response.status).toBe(404);
    expect(changeDelay).not.toHaveBeenCalled();
});
