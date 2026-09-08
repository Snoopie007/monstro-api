import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { SINGLE_NEXT_JOB, singleNextJobId, type SingleNextJobData } from "@subtrees/bullmq";
const payload: SingleNextJobData = {
  previousReservationId: "rsv_1", sessionId: "pss_1", locationId: "loc_1", memberId: "mbr_1",
  nextStartOn: "2099-01-05T20:00:00Z", planType: { type: "package", id: "pkg_1" },
  snapshot: { programId: "prg_1", programName: "Piano", staffId: "stf_1", sessionDay: 1,
    sessionTime: "15:00:00", duration: 30, timezone: "America/New_York" },
};
const jobId = singleNextJobId(payload);
let state: string;
let missing: boolean;
let session: any;
let previous: any;
let stopWhileWaiting = false;
const retry = mock(async () => { state = "waiting"; });
const add = mock(async () => { missing = false; state = "delayed"; });
const job = { id: jobId, name: SINGLE_NEXT_JOB, data: payload, retry, getState: async () => state };
const getJob = mock(async (id: string) => missing || id !== jobId ? undefined : job);
mock.module("@/queues/tasks", () => ({ classQueue: { add, getJob, getJobs: async () => [] } }));
const select = mock(() => {
  const chain: any = { from: () => chain, innerJoin: () => chain, where: () => chain,
    for: async () => [], orderBy: () => chain, limit: async () => [] };
  return chain;
});
mock.module("@/db/db", () => ({ db: {
  select,
  transaction: async (callback: (tx: any) => unknown) => callback({
    execute: async () => { if (stopWhileWaiting) session.reservedMemberId = null; }, select,
    query: {
      programSessions: { findFirst: async () => session }, reservations: { findFirst: async () => previous },
      sessionExceptions: { findFirst: async () => undefined },
    },
  }),
} }));
const { repairSingleNext, singleRecoveryRoutes } = await import("./recovery");
beforeEach(() => {
  mock.clearAllMocks(); state = "failed"; missing = false; stopWhileWaiting = false;
  session = { programId: "prg_1", reservedMemberId: "mbr_1", nextReservationJobId: jobId,
    staffId: "stf_1", time: "15:00:00", day: 1, duration: 30,
    program: { locationId: "loc_1", sessionMode: "one_on_one", location: { timezone: "America/New_York" } } };
  previous = { memberPackageId: "pkg_1", memberSubscriptionId: null, status: "confirmed" };
});
test("retries an exhausted job without changing weekly ownership", async () => {
  expect(await repairSingleNext("loc_1", { jobId })).toMatchObject({ repaired: true });
  expect(retry).toHaveBeenCalledTimes(1);
  expect(session.nextReservationJobId).toBe(jobId);
  expect(add).not.toHaveBeenCalled();
});
test("repeated repair does not enqueue another job", async () => {
  await repairSingleNext("loc_1", { jobId });
  expect(await repairSingleNext("loc_1", { jobId })).toEqual({ repaired: false, reason: "already_queued" });
  expect(retry).toHaveBeenCalledTimes(1);
});
test("recreates a missing job only from its original matching payload", async () => {
  missing = true;
  await expect(repairSingleNext("loc_1", { jobId })).rejects.toThrow("original job payload");
  expect(await repairSingleNext("loc_1", { jobId, payload })).toMatchObject({ repaired: true });
  expect(add).toHaveBeenCalledWith(SINGLE_NEXT_JOB, payload, expect.objectContaining({ jobId }));
});
test("does not revive a weekly booking stopped while repair waited", async () => {
  stopWhileWaiting = true;
  await expect(repairSingleNext("loc_1", { jobId })).rejects.toThrow("stopped");
  expect(retry).not.toHaveBeenCalled();
  expect(add).not.toHaveBeenCalled();
});
test.each(["staff", "plan", "pointer", "tenant"])("rejects changed %s context", async (field) => {
  if (field === "staff") session.staffId = "another";
  if (field === "plan") previous.memberPackageId = "another";
  if (field === "pointer") session.nextReservationJobId = "another";
  if (field === "tenant") session.program.locationId = "another";
  await expect(repairSingleNext("loc_1", { jobId })).rejects.toThrow();
  expect(retry).not.toHaveBeenCalled();
});
test("health and repair endpoints require service authorization", async () => {
  const app = new Elysia({ prefix: "/x/loc/:lid/class" }).derive(() => ({ isServiceRole: false }));
  await singleRecoveryRoutes(app as never);
  expect((await app.handle(new Request("http://localhost/x/loc/loc_1/class/single/health"))).status).toBe(403);
  expect((await app.handle(new Request("http://localhost/x/loc/loc_1/class/single/repair", { method: "POST" }))).status).toBe(403);
  expect(select).not.toHaveBeenCalled();
});
