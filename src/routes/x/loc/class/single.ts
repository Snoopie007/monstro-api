import type { AuthXContext } from "@/middlewares/AuthMW";
import { db } from "@/db/db";
import { classQueue } from "@/queues/tasks";
import {
    SINGLE_NEXT_JOB,
    SingleNextJobSchema,
    singleNextDelay,
    singleNextJobId,
} from "@subtrees/bullmq";
import { programSessions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
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
        await classQueue.add(SINGLE_NEXT_JOB, parsed.data, {
            jobId,
            delay: singleNextDelay(parsed.data.nextStartOn, getNow()),
            attempts: 3,
            removeOnComplete: true,
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
        const jobState = await job.getState();
        if (jobState === "delayed") {
            await job.changeDelay(delay);
        } else if (delay > 0 || !["waiting", "active"].includes(jobState)) {
            return status(409, { error: "Single-next job can no longer be rescheduled" });
        }
        return { rescheduled: true, jobId: parsed.data.jobId, delay };
    });

    return app;
}
