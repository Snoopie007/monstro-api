import { db } from "@/db/db";
import {
    CheckMissedClassSchema,
    ClassReminderJobSchema,
    buildClassReminderJob,
    buildMissedClassJob,
} from "@subtrees/bullmq";
import { reservations } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const ScheduleReservationJobSchema = z.object({
    reservationId: z.string().min(1),
    locationId: z.string().min(1),
});

export async function loadReservationJobs(
    reservationId: string,
    locationId: string,
    now = new Date(),
) {
    const reservation = await db.query.reservations.findFirst({
        where: and(
            eq(reservations.id, reservationId),
            eq(reservations.locationId, locationId),
        ),
        columns: {
            id: true,
            memberId: true,
            programName: true,
            startOn: true,
            endOn: true,
            status: true,
        },
        with: {
            member: { columns: { firstName: true, lastName: true, email: true } },
            location: { columns: { name: true, email: true, phone: true, address: true } },
            staff: { columns: { firstName: true, lastName: true } },
        },
    });
    if (!reservation) return undefined;

    const reminderData = ClassReminderJobSchema.parse({
        rid: reservation.id,
        lid: locationId,
        member: reservation.member,
        location: reservation.location,
        class: {
            name: reservation.programName || "Scheduled Class",
            startTime: reservation.startOn,
            endTime: reservation.endOn,
            instructor: reservation.staff,
        },
    });
    const missedData = CheckMissedClassSchema.parse({
        ...reminderData,
        mid: reservation.memberId,
    });
    return {
        status: reservation.status,
        reminder: buildClassReminderJob(reminderData, now),
        missed: buildMissedClassJob(missedData, now),
    };
}
