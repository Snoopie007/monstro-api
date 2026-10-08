import type { AuthXContext } from "@/middlewares/AuthMW";
import { classQueue } from "@/queues/tasks";
import type { Elysia } from "elysia";
import { loadReservationJobs, ScheduleReservationJobSchema } from "./reservationJobs";

export async function classReminderRoutes(app: Elysia, getNow = () => new Date()) {
    app.post("/reminder", async (context) => {
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
            return status(409, { error: "Only confirmed reservations can schedule reminders" });
        }

        await classQueue.add(jobs.reminder.name, jobs.reminder.data, jobs.reminder.opts);
        return { success: true, jobId: jobs.reminder.opts.jobId };
    });

    app.delete("/reminder/:reservationId", async (context) => {
        const { params, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, { error: "Service role required" });
        const { lid, reservationId } = params as { lid: string; reservationId: string };
        const jobs = await loadReservationJobs(reservationId, lid);
        if (!jobs) return status(404, { error: "Reservation not found" });
        const job = await classQueue.getJob(jobs.reminder.opts.jobId);
        if (!job) return { success: false, message: "No reminder job found" };
        await job.remove();
        return { success: true };
    });

    return app;
}
