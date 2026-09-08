import type { AuthXContext } from "@/middlewares/AuthMW";
import { db } from "@/db/db";
import { classQueue } from "@/queues/tasks";
import {
    SINGLE_NEXT_JOB,
    SingleNextJobSchema,
    singleNextDelay,
    singleNextJobId,
    buildClassReminderJob,
    buildMissedClassJob,
} from "@subtrees/bullmq";
import { programSessions, sessionExceptions } from "@subtrees/schemas";
import { and, eq, sql } from "drizzle-orm";
import { loadReservationJobs } from "./reservationJobs";
import { formatInTimeZone } from "date-fns-tz";
import type { Elysia } from "elysia";
import { z } from "zod";

const RescheduleSingleNextSchema = z.object({
    jobId: z.string().min(1),
    sessionId: z.string().min(1),
    originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startsAt: z.string().datetime(),
});

const forbidden = { error: "Service role required" };

/**
 * Service-only queue transport. Enqueueing is not a booking: the worker validates
 * the stored owner, continuation pointer, and plan before creating a reservation.
 */
export async function singleNextRoutes(app: Elysia, getNow = () => new Date()) {
    app.post("/single/next", async (context) => {
        const { body, params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, forbidden);

        const parsed = SingleNextJobSchema.safeParse(body);
        if (!parsed.success) {
            return status(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
        }
        const { lid } = params as { lid: string };
        if (parsed.data.locationId !== lid) {
            return status(400, { error: "locationId does not match the route location" });
        }

        const jobId = singleNextJobId(parsed.data);
        await db.transaction(async (tx) => {
            // Serialize enqueue with exception writes. If the exception wins, resolve it here;
            // if enqueue wins, its job exists when the exception requests rescheduling.
            await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lid}, 0))`);
            const originalDate = formatInTimeZone(new Date(parsed.data.nextStartOn), parsed.data.snapshot.timezone, "yyyy-MM-dd");
            const exception = await tx.query.sessionExceptions.findFirst({
                where: and(eq(sessionExceptions.sessionId, parsed.data.sessionId), eq(sessionExceptions.originalDate, originalDate)),
                columns: { startsAt: true, isCancelled: true },
            });
            const runAt = exception && !exception.isCancelled ? exception.startsAt : parsed.data.nextStartOn;
            await classQueue.add(SINGLE_NEXT_JOB, parsed.data, {
                jobId, delay: singleNextDelay(runAt, getNow()), attempts: 3, removeOnComplete: true,
            });
        });
        return { queued: true, jobId };
    });

    app.post("/single/reschedule", async (context) => {
        const { body, params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, forbidden);

        const parsed = RescheduleSingleNextSchema.safeParse(body);
        if (!parsed.success) {
            return status(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
        }
        const job = await classQueue.getJob(parsed.data.jobId);
        const jobData = SingleNextJobSchema.safeParse(job?.data);
        const { lid } = params as { lid: string };
        if (
            !job
            || job.name !== SINGLE_NEXT_JOB
            || !jobData.success
            || jobData.data.locationId !== lid
            || jobData.data.sessionId !== parsed.data.sessionId
        ) {
            return status(404, { error: "Active single-next job not found" });
        }
        // Exceptions change the execution time, not the job's regular occurrence identity.
        const regularDate = formatInTimeZone(
            new Date(jobData.data.nextStartOn),
            jobData.data.snapshot.timezone,
            "yyyy-MM-dd",
        );
        if (regularDate !== parsed.data.originalDate) {
            return status(409, { error: "originalDate does not match the queued occurrence" });
        }
        const session = await db.query.programSessions.findFirst({
            where: eq(programSessions.id, parsed.data.sessionId),
            columns: { nextReservationJobId: true },
            with: { program: { columns: { locationId: true } } },
        });
        if (
            !session
            || session.program.locationId !== lid
            || session.nextReservationJobId !== parsed.data.jobId
        ) {
            return status(404, { error: "Active single-next job not found" });
        }

        const delay = singleNextDelay(parsed.data.startsAt, getNow());
        // Only delayed jobs can change delay; an active handler cannot be interrupted here.
        const jobState = await job.getState();
        if (jobState === "delayed") {
            await job.changeDelay(delay);
        } else if (delay > 0 || !["waiting", "active"].includes(jobState)) {
            return status(409, { error: "Single-next job can no longer be rescheduled" });
        }
        return { rescheduled: true, jobId: parsed.data.jobId, delay };
    });

    app.post("/single/occurrence", async (context) => {
        const { body, params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, forbidden);
        const parsed = z.object({
            reservationId: z.string().min(1), previousStartOn: z.string().datetime(), previousEndOn: z.string().datetime(),
        }).safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid occurrence request" });
        const { lid } = params as { lid: string };
        const current = await loadReservationJobs(parsed.data.reservationId, lid, getNow());
        if (!current) return status(404, { error: "Reservation not found" });
        const oldTimes = { startTime: new Date(parsed.data.previousStartOn), endTime: new Date(parsed.data.previousEndOn) };
        const previous = [
            buildClassReminderJob({ ...current.reminder.data, class: { ...current.reminder.data.class, ...oldTimes } }),
            buildMissedClassJob({ ...current.missed.data, class: { ...current.missed.data.class, ...oldTimes } }),
        ];
        const replacements = current.status === "confirmed" ? [current.reminder, current.missed] : [];
        // Queue replacements first. A failed cleanup cannot lose the new lesson's jobs.
        for (const job of replacements) await classQueue.add(job.name, job.data, job.opts);
        for (const old of previous) {
            if (replacements.some(job => job.opts.jobId === old.opts.jobId)) continue;
            const job = await classQueue.getJob(old.opts.jobId);
            if (job && await job.getState() !== "active") await job.remove();
        }
        return { refreshed: true };
    });

    return app;
}
