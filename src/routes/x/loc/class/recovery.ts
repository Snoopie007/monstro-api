import { db } from "@/db/db";
import type { AuthXContext } from "@/middlewares/AuthMW";
import { classQueue } from "@/queues/tasks";
import { SINGLE_NEXT_JOB, SingleNextJobSchema, singleNextDelay, singleNextJobId, type SingleNextJobData } from "@subtrees/bullmq";
import { shiftDateKey } from "@subtrees/constants/recurrence";
import { programSessions, programs, reservations, sessionExceptions } from "@subtrees/schemas";
import { and, eq, gt, isNotNull, lt, or, sql } from "drizzle-orm";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Elysia } from "elysia";
import { z } from "zod";
import { withTimeout } from "../subscriptions/shared";

const pageSize = 100;
const liveStates = ["active", "waiting", "delayed", "prioritized"];
const repairRequest = z.object({ jobId: z.string().min(1), payload: SingleNextJobSchema.optional() }).strict();
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
class RepairError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

function successorId(data: SingleNextJobData) {
  const date = formatInTimeZone(new Date(data.nextStartOn), data.snapshot.timezone, "yyyy-MM-dd");
  const nextStartOn = fromZonedTime(`${shiftDateKey(date, 7)}T${data.snapshot.sessionTime}`, data.snapshot.timezone).toISOString();
  return singleNextJobId({ ...data, nextStartOn });
}

export async function repairSingleNext(locationId: string, input: z.infer<typeof repairRequest>) {
  const job = await withTimeout(classQueue.getJob(input.jobId), 5000, "Queue unavailable");
  if (job && job.name !== SINGLE_NEXT_JOB) throw new RepairError("Not a single-next job");
  const parsed = SingleNextJobSchema.safeParse(job?.data ?? input.payload);
  if (!parsed.success) throw new RepairError("The original job payload is required; do not guess its plan or dates");
  const data = parsed.data;
  if (data.locationId !== locationId || singleNextJobId(data) !== input.jobId) throw new RepairError("Job identity does not match this location");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${locationId}, 0))`);
    await tx.select({ id: programSessions.id }).from(programSessions)
      .innerJoin(programs, eq(programs.id, programSessions.programId))
      .where(and(eq(programSessions.id, data.sessionId), eq(programs.locationId, locationId))).for("update");
    const pointer = await loadRepairPointer(tx, locationId, data, input.jobId);
    const previous = await tx.query.reservations.findFirst({
      where: and(eq(reservations.id, data.previousReservationId), eq(reservations.locationId, locationId),
        eq(reservations.sessionId, data.sessionId), eq(reservations.memberId, data.memberId)),
      columns: { memberPackageId: true, memberSubscriptionId: true, status: true },
    });
    const planId = data.planType.type === "package" ? previous?.memberPackageId : previous?.memberSubscriptionId;
    if (!previous || previous.status === "pending_payment" || planId !== data.planType.id) {
      throw new RepairError("The original reservation or plan does not match this job");
    }
    if (pointer !== input.jobId) {
      const successor = await withTimeout(classQueue.getJob(pointer), 5000, "Queue unavailable");
      if (successor && liveStates.includes(await withTimeout(successor.getState(), 5000, "Queue unavailable"))) return { repaired: false, reason: "successor_already_queued" };
    }
    if (job) {
      const state = await withTimeout(job.getState(), 5000, "Queue unavailable");
      if (liveStates.includes(state)) return { repaired: false, reason: "already_queued" };
      if (state !== "failed") throw new RepairError("Only a failed or missing job can be repaired");
      await withTimeout(job.retry("failed"), 5000, "Queue unavailable");
    } else {
      const date = formatInTimeZone(new Date(data.nextStartOn), data.snapshot.timezone, "yyyy-MM-dd");
      const exception = await tx.query.sessionExceptions.findFirst({
        where: and(eq(sessionExceptions.sessionId, data.sessionId), eq(sessionExceptions.originalDate, date)),
        columns: { startsAt: true, isCancelled: true },
      });
      await withTimeout(classQueue.add(SINGLE_NEXT_JOB, data, {
        jobId: input.jobId, attempts: 3, removeOnComplete: true,
        delay: singleNextDelay(exception && !exception.isCancelled ? exception.startsAt : data.nextStartOn),
      }), 5000, "Queue unavailable");
    }
    // Do not write ownership or advance the pointer. The normal worker does that.
    return { repaired: true, jobId: input.jobId };
  });
}

async function loadRepairPointer(tx: Transaction, locationId: string, data: SingleNextJobData, jobId: string) {
  const session = await tx.query.programSessions.findFirst({
    where: eq(programSessions.id, data.sessionId),
    with: { program: { with: { location: { columns: { timezone: true } } } } },
  });
  if (!session || session.program.locationId !== locationId || session.program.sessionMode !== "one_on_one"
    || session.reservedMemberId !== data.memberId || !session.nextReservationJobId) {
    throw new RepairError("The weekly booking was stopped, transferred or removed");
  }
  if (![jobId, successorId(data)].includes(session.nextReservationJobId)) {
    throw new RepairError("The weekly booking has advanced beyond this job");
  }
  if (session.programId !== data.snapshot.programId || session.staffId !== data.snapshot.staffId
    || session.time !== data.snapshot.sessionTime || session.day !== data.snapshot.sessionDay
    || session.duration !== data.snapshot.duration || session.program.location.timezone !== data.snapshot.timezone) {
    throw new RepairError("The saved schedule changed; review the weekly booking before recovery");
  }
  return session.nextReservationJobId;
}

export async function inspectSingleNext(locationId: string, cursor?: string, failedOffset = 0) {
  const sessions = await db.select({ id: programSessions.id, memberId: programSessions.reservedMemberId, jobId: programSessions.nextReservationJobId })
    .from(programSessions).innerJoin(programs, eq(programs.id, programSessions.programId))
    .where(and(eq(programs.locationId, locationId), or(isNotNull(programSessions.reservedMemberId), isNotNull(programSessions.nextReservationJobId)),
      cursor ? gt(programSessions.id, cursor) : undefined)).orderBy(programSessions.id).limit(pageSize);
  const slots = await Promise.all(sessions.map(async (session) => {
    if (!session.jobId || !session.memberId) return { ...session, state: "incomplete_ownership", healthy: false };
    const job = await classQueue.getJob(session.jobId);
    const data = SingleNextJobSchema.safeParse(job?.data);
    const matches = job?.name === SINGLE_NEXT_JOB && data.success && data.data.locationId === locationId
      && data.data.sessionId === session.id && data.data.memberId === session.memberId && singleNextJobId(data.data) === session.jobId;
    const state = job ? await job.getState() : "missing";
    return { ...session, state: matches || !job ? state : "payload_mismatch", healthy: Boolean(matches && liveStates.includes(state)) };
  }));
  const failedJobs = await classQueue.getJobs(["failed"], failedOffset, failedOffset + pageSize - 1);
  const failed = failedJobs.filter(job => job.name === SINGLE_NEXT_JOB && job.data.locationId === locationId)
    .map(job => ({ jobId: job.id, reason: job.failedReason, payload: job.data }));
  const pendingPayments = await db.select({ id: reservations.id, created: reservations.created }).from(reservations)
    .where(and(eq(reservations.locationId, locationId), eq(reservations.status, "pending_payment"),
      lt(reservations.created, new Date(Date.now() - 60 * 60_000)))).orderBy(reservations.created).limit(pageSize);
  // Failed predecessor jobs can remain as history after their successor is healthy.
  return { healthy: slots.every(slot => slot.healthy) && pendingPayments.length === 0,
    slots, failed, pendingPayments, nextCursor: sessions.length === pageSize ? sessions.at(-1)!.id : null,
    nextFailedOffset: failedJobs.length === pageSize ? failedOffset + pageSize : null };
}

export async function singleRecoveryRoutes(app: Elysia) {
  app.get("/single/health", async (context) => {
    const { params, query, status, isServiceRole } = context as typeof context & AuthXContext;
    if (!isServiceRole) return status(403, { error: "Service role required" });
    const parsed = z.object({ cursor: z.string().optional(), failedOffset: z.coerce.number().int().min(0).default(0) }).safeParse(query);
    if (!parsed.success) return status(400, { error: "Invalid health cursor" });
    return inspectSingleNext((params as { lid: string }).lid, parsed.data.cursor, parsed.data.failedOffset);
  });
  app.post("/single/repair", async (context) => {
    const { body, params, status, isServiceRole } = context as typeof context & AuthXContext;
    if (!isServiceRole) return status(403, { error: "Service role required" });
    const parsed = repairRequest.safeParse(body);
    if (!parsed.success) return status(400, { error: "Invalid repair request" });
    try { return await repairSingleNext((params as { lid: string }).lid, parsed.data); }
    catch (error) {
      if (error instanceof RepairError) return status(error.status, { error: error.message });
      throw error;
    }
  });
  return app;
}
