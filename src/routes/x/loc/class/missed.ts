import type { AuthXContext } from "@/middlewares/AuthMW";
import { classQueue } from "@/queues/tasks";
import type { Elysia } from "elysia";
import { loadReservationJobs, ScheduleReservationJobSchema } from "./reservationJobs";

export async function missedClassCheckRoutes(app: Elysia, getNow = () => new Date()) {
    app.post("/missed", async (context) => {
        const { body, params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, { error: "Service role required" });
        const parsed = ScheduleReservationJobSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid request" });
        const { lid } = params as { lid: string };
        if (parsed.data.locationId !== lid) {
            return status(400, { error: "locationId does not match the route location" });
        }

        const jobs = await loadReservationJobs(parsed.data.reservationId, lid, getNow());
        if (!jobs) return status(404, { error: "Reservation not found" });
        if (jobs.status !== "confirmed") {
            return status(409, { error: "Only confirmed reservations can schedule missed checks" });
        }

        await classQueue.add(jobs.missed.name, jobs.missed.data, jobs.missed.opts);
        return { success: true, jobId: jobs.missed.opts.jobId };
    });

    app.delete("/missed/:reservationId", async (context) => {
        const { params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, { error: "Service role required" });
        const { lid, reservationId } = params as { lid: string; reservationId: string };
        const jobs = await loadReservationJobs(reservationId, lid);
        if (!jobs) return status(404, { error: "Reservation not found" });
        const job = await classQueue.getJob(jobs.missed.opts.jobId);
        if (!job) return { success: false, message: "No missed-class job found" };
        await job.remove();
        return { success: true };
    });

    return app;
}
