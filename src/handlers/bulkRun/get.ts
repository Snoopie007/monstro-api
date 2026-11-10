import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
    courses,
    eventTickets,
    locationEvents,
    memberBulkRunItems,
    memberBulkRuns,
    members,
} from "@/subtrees/schemas";
import { BulkRunError } from "./errors";
import { emptyCounts, toRunSummary } from "./shared";

/** One bulk run with every member's result, sorted by member name. */
export async function handleGetBulkRun(lid: string, runId: string) {
    const run = await db.query.memberBulkRuns.findFirst({
        where: and(eq(memberBulkRuns.id, runId), eq(memberBulkRuns.locationId, lid)),
    });
    if (!run) throw new BulkRunError(404, "Bulk run not found");

    const [items, event, ticket, course] = await Promise.all([
        db.select({
            id: memberBulkRunItems.id,
            memberId: memberBulkRunItems.memberId,
            status: memberBulkRunItems.status,
            code: memberBulkRunItems.code,
            message: memberBulkRunItems.message,
            details: memberBulkRunItems.details,
            finished: memberBulkRunItems.finished,
            firstName: members.firstName,
            lastName: members.lastName,
            email: members.email,
        })
            .from(memberBulkRunItems)
            .innerJoin(members, eq(members.id, memberBulkRunItems.memberId))
            .where(eq(memberBulkRunItems.runId, run.id))
            .orderBy(asc(members.firstName), asc(members.lastName), asc(memberBulkRunItems.id)),
        typeof run.input.eventId === "string"
            ? db.query.locationEvents.findFirst({
                where: and(eq(locationEvents.id, run.input.eventId), eq(locationEvents.locationId, lid)),
                columns: { name: true },
            })
            : undefined,
        typeof run.input.ticketId === "string"
            ? db.query.eventTickets.findFirst({ where: eq(eventTickets.id, run.input.ticketId), columns: { name: true, price: true } })
            : undefined,
        typeof run.input.courseId === "string"
            ? db.query.courses.findFirst({
                where: and(eq(courses.id, run.input.courseId), eq(courses.locationId, lid)),
                columns: { title: true, price: true },
            })
            : undefined,
    ]);

    const counts = emptyCounts();
    for (const item of items) counts[item.status] += 1;

    return {
        ...toRunSummary(run, counts, {
            eventName: event?.name ?? null,
            ticketName: ticket?.name ?? null,
            ticketPrice: ticket?.price ?? null,
            courseTitle: course?.title ?? null,
            coursePrice: course?.price ?? null,
        }),
        items,
    };
}
