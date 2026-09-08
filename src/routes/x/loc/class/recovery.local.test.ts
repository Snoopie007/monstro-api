import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Queue, Worker } from "bullmq";
import * as schema from "@subtrees/schemas";
import { SINGLE_NEXT_JOB, singleNextJobId, type SingleNextJobData } from "@subtrees/bullmq";

const databaseUrl = process.env.ONE_ON_ONE_TEST_DATABASE_URL;
const redisUrl = process.env.ONE_ON_ONE_TEST_REDIS_URL;
const localTests = databaseUrl && redisUrl ? describe : describe.skip;
const namespace = `test_recovery_${randomUUID().replaceAll("-", "")}`;
const tables = ["locations", "programs", "program_sessions", "reservations", "session_exceptions"];
let queue: Queue;
let admin: ReturnType<typeof postgres>;
let client: ReturnType<typeof postgres>;
let database: ReturnType<typeof drizzle<typeof schema>>;
let connection: { host: string; port: number; password: string; maxRetriesPerRequest: null };
mock.module("@/queues/tasks", () => ({ classQueue: new Proxy({} as Queue, { get: (_, key) => {
  const value = Reflect.get(queue, key); return typeof value === "function" ? value.bind(queue) : value;
} }) }));
mock.module("@/db/db", () => ({ db: new Proxy({}, { get: (_, key) => {
  const value = Reflect.get(database, key); return typeof value === "function" ? value.bind(database) : value;
} }) }));
const { repairSingleNext, inspectSingleNext } = await import("./recovery");
const payload: SingleNextJobData = {
  previousReservationId: "rsv_test", sessionId: "pss_test", locationId: "loc_test", memberId: "mbr_test",
  nextStartOn: "2099-01-05T20:00:00Z", planType: { type: "package", id: "pkg_test" },
  snapshot: { programId: "prg_test", programName: "Piano", staffId: "stf_test", sessionDay: 1,
    sessionTime: "15:00:00", duration: 30, timezone: "America/New_York" },
};
const jobId = singleNextJobId(payload);

localTests("continuation repair with local Postgres and Redis", () => {
  beforeAll(async () => {
    const pg = new URL(databaseUrl!); const redis = new URL(redisUrl!);
    for (const url of [pg, redis]) {
      if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.search) throw new Error("Local test services required");
    }
    connection = { host: redis.hostname, port: Number(redis.port || 6379), password: decodeURIComponent(redis.password), maxRetriesPerRequest: null };
    queue = new Queue(namespace, { connection });
    admin = postgres(databaseUrl!, { max: 1, onnotice: () => {} });
    await admin`create schema ${admin(namespace)}`;
    for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
    client = postgres(databaseUrl!, { max: 2, prepare: false, connection: { search_path: `${namespace},public,extensions` } });
    database = drizzle(client, { schema });
  });
  afterAll(async () => {
    if (!/^test_recovery_[a-f0-9]{32}$/.test(namespace)) throw new Error("Invalid test namespace");
    if (queue) { await queue.obliterate({ force: true }); await queue.close(); }
    if (client) await client.end();
    if (admin) { await admin`drop schema ${admin(namespace)} cascade`; await admin.end(); }
  });
  beforeEach(async () => {
    await queue.obliterate({ force: true });
    for (const table of tables) await client`truncate ${client(table)}`;
    await client`insert into locations (id,name,slug,vendor_id,timezone) values ('loc_test','School','test-school','vdr_test','America/New_York')`;
    await client`insert into programs (id,location_id,name,description,capacity,min_age,max_age,session_mode)
      values ('prg_test','loc_test','Piano','Test',1,0,100,'one_on_one')`;
    await client`insert into program_sessions (id,program_id,time,day,duration,staff_id,reserved_member_id,next_reservation_job_id)
      values ('pss_test','prg_test','15:00',1,30,'stf_test','mbr_test',${jobId})`;
    await client`insert into reservations (id,member_id,location_id,session_id,member_package_id,start_on,end_on)
      values ('rsv_test','mbr_test','loc_test','pss_test','pkg_test','2098-12-29T20:00:00Z','2098-12-29T20:30:00Z')`;
  });
  test("reports a missing job, recreates it once, and then reports a healthy slot", async () => {
    expect((await inspectSingleNext("loc_test")).slots[0]).toMatchObject({ healthy: false, state: "missing" });
    expect(await repairSingleNext("loc_test", { jobId, payload })).toMatchObject({ repaired: true });
    expect(await repairSingleNext("loc_test", { jobId, payload })).toMatchObject({ repaired: false });
    expect(await queue.getDelayedCount()).toBe(1);
    expect((await inspectSingleNext("loc_test")).slots[0]).toMatchObject({ healthy: true, state: "delayed" });
  });
  test("a stopped slot stays stopped after a repair request", async () => {
    await client`update program_sessions set reserved_member_id=null,next_reservation_job_id=null`;
    await expect(repairSingleNext("loc_test", { jobId, payload })).rejects.toThrow("stopped");
    expect(await queue.getJob(jobId)).toBeUndefined();
  });
  test("retries a real failed job after the DB pointer has advanced", async () => {
    const worker = new Worker(namespace, async () => { throw new Error("Simulated enqueue failure"); }, { connection });
    try {
      const failed = new Promise<void>(resolve => worker.once("failed", () => resolve()));
      await queue.add(SINGLE_NEXT_JOB, payload, { jobId, attempts: 1 });
      await failed;
    } finally { await worker.close(); }
    const successor = singleNextJobId({ ...payload, nextStartOn: "2099-01-12T20:00:00Z" });
    await client`update program_sessions set next_reservation_job_id=${successor}`;
    expect(await repairSingleNext("loc_test", { jobId })).toMatchObject({ repaired: true });
    expect(await (await queue.getJob(jobId))!.getState()).toBe("waiting");
    expect((await client`select next_reservation_job_id from program_sessions`)[0]?.next_reservation_job_id).toBe(successor);
  });
});
