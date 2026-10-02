import { beforeEach, expect, mock, test } from "bun:test";

const getJobScheduler = mock(async (_id: string): Promise<any> => undefined);
const getJob = mock(async (_id: string): Promise<any> => undefined);
// Deliberately expose only keyed queue reads: global scans are not supported.
mock.module("@/queues/subscriptions", () => ({ subQueue: { getJobScheduler, getJob } }));
mock.module("@/db/db", () => ({ db: {} }));
const { loadSchedules } = await import("./index");
const dueAt = new Date("2026-10-08T12:00:00Z");
const subscription = {
    id: "sub", locationId: "loc", parentId: null, paymentType: "card", status: "active",
    startDate: new Date("2026-09-08T12:00:00Z"), trialEnd: null, currentPeriodEnd: dueAt,
};
const exactId = `renewal-exact-sub-${dueAt.getTime()}`;
const job = (state = "delayed", data = {}) => ({
    data: { sid: "sub", lid: "loc", expectedDueAt: dueAt.toISOString(), recurrenceCount: 4, ...data },
    getState: async () => state,
});
beforeEach(() => {
    getJobScheduler.mockReset().mockResolvedValue(undefined);
    getJob.mockReset().mockResolvedValue(undefined);
});

test("reads only this subscription's current keyed schedules", async () => {
    expect((await loadSchedules([subscription], "loc")).size).toBe(0);
    expect(getJobScheduler.mock.calls).toEqual([["renewal:static:sub"]]);
    expect(getJob.mock.calls).toEqual([["renewal:recursive:sub"], [exactId], [`${exactId}-recovery`]]);
});

test("a failed exact job cannot hide its live recovery", async () => {
    getJob.mockImplementation(async id => id === exactId ? job("failed")
        : id === `${exactId}-recovery` ? job() : undefined);
    expect((await loadSchedules([subscription], "loc")).get("sub")).toMatchObject({ dueAt, cycleCount: 4, blocked: false });
});

test.each(["delayed", "waiting", "active", "prioritized", "failed"])("recognizes %s jobs", async state => {
    getJob.mockImplementation(async id => id === exactId ? job(state) : undefined);
    expect((await loadSchedules([subscription], "loc")).get("sub")).toMatchObject({ blocked: state === "failed" });
});

test.each(["completed", "unknown", "waiting-children"])("ignores %s jobs", async state => {
    getJob.mockResolvedValue(job(state));
    expect((await loadSchedules([subscription], "loc")).size).toBe(0);
});

test("reads a legacy recursive job's timestamp and delay", async () => {
    getJob.mockImplementation(async id => id === "renewal:recursive:sub" ? {
        ...job(), data: { sid: "sub", lid: "loc", recurrenceCount: 2 },
        timestamp: dueAt.getTime() - 1000, opts: { delay: 1000 },
    } : undefined);
    expect((await loadSchedules([subscription], "loc")).get("sub")).toMatchObject({ dueAt, cycleCount: 2 });
});

test("keeps the static cron cadence", async () => {
    getJobScheduler.mockResolvedValue({ template: { data: { sid: "sub", lid: "loc" } },
        next: dueAt.getTime(), pattern: "0 12 8 * *", iterationCount: 3 });
    const schedule = (await loadSchedules([subscription], "loc")).get("sub");
    expect(schedule?.cycleCount).toBe(4);
    expect(schedule?.nextDueAt?.(dueAt)).toEqual(new Date("2026-11-08T12:00:00Z"));
});

test.each([{ sid: "other" }, { lid: "other" }])("rejects foreign queue data %j", async foreign => {
    getJob.mockResolvedValue(job("delayed", foreign));
    getJobScheduler.mockResolvedValue({ template: { data: { sid: "sub", lid: "loc", ...foreign } }, next: dueAt.getTime() });
    expect((await loadSchedules([subscription], "loc")).size).toBe(0);
});

test("never looks up cash, child, inactive, or foreign subscriptions", async () => {
    const excluded = [{ paymentType: "cash" }, { parentId: "parent" }, { status: "paused" }, { locationId: "other" }];
    expect((await loadSchedules(excluded.map(value => ({ ...subscription, ...value })), "loc")).size).toBe(0);
    expect(getJob).not.toHaveBeenCalled();
    expect(getJobScheduler).not.toHaveBeenCalled();
});

test("targets trial end and deferred first-charge dates", async () => {
    await loadSchedules([{ ...subscription, status: "trialing", trialEnd: subscription.startDate }], "loc");
    expect(getJob).toHaveBeenCalledWith(`renewal-exact-sub-${subscription.startDate.getTime()}`);
    getJob.mockClear();
    await loadSchedules([{ ...subscription, status: "incomplete" }], "loc");
    expect(getJob).toHaveBeenCalledWith(`renewal-exact-sub-${subscription.startDate.getTime()}`);
});

test("ignores a stale cycle stored under a known job ID", async () => {
    getJob.mockResolvedValue(job("delayed", { expectedDueAt: "2026-09-08T12:00:00Z" }));
    expect((await loadSchedules([subscription], "loc")).size).toBe(0);
});

test("limits queue lookup fanout to ten subscriptions at a time", async () => {
    let releaseFirstBatch!: () => void;
    const gate = new Promise<void>(resolve => { releaseFirstBatch = resolve; });
    getJobScheduler.mockImplementation(async () => { await gate; return undefined; });
    const loading = loadSchedules(Array.from({ length: 21 }, (_, index) => ({ ...subscription, id: `sub${index}` })), "loc");
    // All initial calls execute before their first await; unresolved reads must
    // prevent the second batch from starting.
    expect(getJobScheduler).toHaveBeenCalledTimes(10);
    expect(getJob).toHaveBeenCalledTimes(30);
    releaseFirstBatch();
    await loading;
    expect(getJobScheduler).toHaveBeenCalledTimes(21);
    expect(getJob).toHaveBeenCalledTimes(63);
});
