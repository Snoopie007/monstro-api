import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import { buildClassReminderJob, buildMissedClassJob } from "@subtrees/bullmq";
const add = mock(async () => undefined);
const remove = mock(async () => undefined);
let state = "delayed";
const getJob = mock(async (_jobId: string) => ({ remove, getState: async () => state }));
const loadReservationJobs = mock(async (): Promise<any> => undefined);
mock.module("@/queues/tasks", () => ({ classQueue: { add, getJob } }));
mock.module("@/db/db", () => ({ db: {} }));
mock.module("./reservationJobs", () => ({ loadReservationJobs }));
const { singleNextRoutes } = await import("./single");
const data = {
  rid: "rsv_1", lid: "loc_1", mid: "mbr_1",
  member: { firstName: "Ava", lastName: null, email: "test@example.test" },
  location: { name: "School", email: null, phone: null },
  class: { name: "Piano", startTime: new Date("2099-01-02T20:00:00Z"), endTime: new Date("2099-01-02T20:30:00Z") },
};
let jobs: { status: string; reminder: ReturnType<typeof buildClassReminderJob>; missed: ReturnType<typeof buildMissedClassJob> };
beforeEach(() => {
  mock.clearAllMocks(); state = "delayed";
  jobs = { status: "confirmed", reminder: buildClassReminderJob(data), missed: buildMissedClassJob(data) };
  loadReservationJobs.mockImplementation(async () => jobs);
});
async function refresh(service = true) {
  const app = new Elysia({ prefix: "/x/loc/:lid/class" }).derive(() => ({ isServiceRole: service }));
  await singleNextRoutes(app as never);
  return app.handle(new Request("http://localhost/x/loc/loc_1/class/single/occurrence", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      reservationId: "rsv_1", previousStartOn: "2099-01-01T20:00:00Z", previousEndOn: "2099-01-01T20:30:00Z",
    }),
  }));
}
test("replaces a moved lesson's jobs before removing the old jobs", async () => {
  expect((await refresh()).status).toBe(200);
  expect(add).toHaveBeenCalledTimes(2);
  expect(remove).toHaveBeenCalledTimes(2);
  expect(getJob.mock.calls[0]?.[0]).toBe(`class:reminder:rsv_1-${Date.parse("2099-01-01T20:00:00Z")}`);
});
test("only removes jobs for a cancelled lesson", async () => {
  jobs.status = "cancelled_by_vendor";
  expect((await refresh()).status).toBe(200);
  expect(add).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalledTimes(2);
});
test("leaves already-active jobs for the worker's stale-occurrence guard", async () => {
  state = "active";
  expect((await refresh()).status).toBe(200);
  expect(remove).not.toHaveBeenCalled();
});
test("requires a service caller and a reservation in the route location", async () => {
  expect((await refresh(false)).status).toBe(403);
  loadReservationJobs.mockResolvedValue(undefined);
  expect((await refresh()).status).toBe(404);
  expect(add).not.toHaveBeenCalled();
});
