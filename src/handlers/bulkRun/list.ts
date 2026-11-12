import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import {
    courses,
    eventTickets,
    locationEvents,
    memberBulkRunItems,
    memberBulkRuns,
} from "@/subtrees/schemas";
import { emptyCounts, getPaymentGatewayMode, toRunSummary } from "./shared";

/** `page` starts at 1, like the members list. */
const PageSchema = z.object({
    page: z.coerce.number().int().min(1).catch(1),
    size: z.coerce.number().int().min(1).max(100).catch(25),
});

/** One page of the location's bulk runs, newest first, with member counts per status, plus how the location charges cards. */
export async function handleListBulkRuns(lid: string, query: unknown) {
    const { page, size } = PageSchema.parse(query ?? {});
    const inLocation = eq(memberBulkRuns.locationId, lid);
    const [runs, [counted]] = await Promise.all([
        db.select().from(memberBulkRuns)
            .where(inLocation)
            .orderBy(desc(memberBulkRuns.created), desc(memberBulkRuns.id))
            .limit(size)
            .offset((page - 1) * size),
        db.select({ total: count() }).from(memberBulkRuns).where(inLocation),
    ]);

    const runIds = runs.map((run) => run.id);
    const counts = runIds.length > 0
        ? await db.select({ runId: memberBulkRunItems.runId, status: memberBulkRunItems.status, count: count() })
            .from(memberBulkRunItems)
            .where(inArray(memberBulkRunItems.runId, runIds))
            .groupBy(memberBulkRunItems.runId, memberBulkRunItems.status)
        : [];

    // Name what each run targeted, such as the event and ticket, for the list.
    const inputIds = (key: "eventId" | "ticketId" | "courseId") =>
        [...new Set(runs.map((run) => run.input[key]).filter((id): id is string => typeof id === "string"))];
    const eventIds = inputIds("eventId");
    const ticketIds = inputIds("ticketId");
    const courseIds = inputIds("courseId");
    const [eventRows, ticketRows, courseRows] = await Promise.all([
        eventIds.length > 0
            ? db.select({ id: locationEvents.id, name: locationEvents.name }).from(locationEvents)
                .where(and(inArray(locationEvents.id, eventIds), eq(locationEvents.locationId, lid)))
            : [],
        ticketIds.length > 0
            ? db.select({ id: eventTickets.id, name: eventTickets.name, price: eventTickets.price }).from(eventTickets)
                .where(inArray(eventTickets.id, ticketIds))
            : [],
        courseIds.length > 0
            ? db.select({ id: courses.id, title: courses.title, price: courses.price }).from(courses)
                .where(and(inArray(courses.id, courseIds), eq(courses.locationId, lid)))
            : [],
    ]);
    const events = new Map(eventRows.map((row) => [row.id, row]));
    const tickets = new Map(ticketRows.map((row) => [row.id, row]));
    const courseById = new Map(courseRows.map((row) => [row.id, row]));

    // A misconfigured gateway still lets the list load; card actions skip members at run time.
    const paymentGateway = await getPaymentGatewayMode(lid).catch(() => "manual" as const);

    return {
        paymentGateway,
        page,
        pageSize: size,
        total: counted?.total ?? 0,
        runs: runs.map((run) => {
            const runCounts = emptyCounts();
            for (const row of counts) {
                if (row.runId === run.id) runCounts[row.status] = row.count;
            }
            const event = typeof run.input.eventId === "string" ? events.get(run.input.eventId) : undefined;
            const ticket = typeof run.input.ticketId === "string" ? tickets.get(run.input.ticketId) : undefined;
            const course = typeof run.input.courseId === "string" ? courseById.get(run.input.courseId) : undefined;
            return toRunSummary(run, runCounts, {
                eventName: event?.name ?? null,
                ticketName: ticket?.name ?? null,
                ticketPrice: ticket?.price ?? null,
                courseTitle: course?.title ?? null,
                coursePrice: course?.price ?? null,
            });
        }),
    };
}
