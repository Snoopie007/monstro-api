import { classQueue } from "@/queues";
import {
    PRIVATE_RESERVATION_MATERIALIZE_JOB,
    PrivateReservationMaterializationJobSchema,
} from "@subtrees/bullmq";
import type Elysia from "elysia";

export async function privateReservationMaterializationRoutes(app: Elysia) {
    return app.post("/private-reservations/materialize", async ({ body, params, status }) => {
        const parsed = PrivateReservationMaterializationJobSchema.safeParse(body);
        if (!parsed.success) {
            return status(400, { error: parsed.error.issues[0]?.message ?? "Invalid request" });
        }

        const { lid } = params as { lid: string };
        if (parsed.data.locationId !== lid) {
            return status(400, { error: "locationId does not match the route location" });
        }

        const jobId = `${PRIVATE_RESERVATION_MATERIALIZE_JOB}:${parsed.data.privateReservationId}`;
        await classQueue.add(PRIVATE_RESERVATION_MATERIALIZE_JOB, parsed.data, {
            jobId,
            removeOnComplete: true,
        });
        return { queued: true, jobId };
    });
}
