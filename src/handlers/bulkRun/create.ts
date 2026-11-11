import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import { bulkRunQueue } from "@/queues";
import {
    courses,
    eventTickets,
    locationEvents,
    memberBulkRunItems,
    memberBulkRuns,
    memberLocations,
    users,
} from "@/subtrees/schemas";
import type { BulkRunInput } from "@/subtrees/types";
import { hasLocationPermissions, type LocationPermission } from "@/utils/locationAccess";
import { BulkRunError } from "./errors";
import { getPaymentGatewayMode, type BulkRunActor } from "./shared";

/** Paid actions are capped lower so a mistake cannot charge a whole roster. */
const PAID_MEMBER_LIMIT = 50;
const MEMBER_LIMIT = 1000;

const MemberIds = z.array(z.string().min(1).max(64)).min(1).max(MEMBER_LIMIT);

const BulkRunSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("resend_invite"), memberIds: MemberIds }).strict(),
    z.object({ action: z.literal("archive"), memberIds: MemberIds }).strict(),
    z.object({
        action: z.literal("register_event"),
        memberIds: MemberIds,
        eventId: z.string().min(1),
        ticketId: z.string().min(1),
        includeNonDefaultCards: z.boolean().default(false),
    }).strict(),
    z.object({
        action: z.literal("enroll_course"),
        memberIds: MemberIds,
        courseId: z.string().min(1),
        includeNonDefaultCards: z.boolean().default(false),
    }).strict(),
    z.object({
        action: z.literal("charge"),
        memberIds: MemberIds,
        amount: z.number().int().min(100).max(10_000_00),
        item: z.string().trim().min(1).max(200),
        description: z.string().trim().max(500).optional(),
        includeNonDefaultCards: z.boolean().default(false),
    }).strict(),
]);

type CreateBulkRunParams = {
    lid: string;
    actor: BulkRunActor;
    body: unknown;
};

/**
 * Saves a bulk run and one row per member, then queues a job for the worker to run it.
 * Every check on what staff asked for happens here, before anything is saved.
 */
export async function handleCreateBulkRun({ lid, actor, body: rawBody }: CreateBulkRunParams) {
    const parsed = BulkRunSchema.safeParse(rawBody);
    if (!parsed.success) throw new BulkRunError(400, "Choose an action and at least one member");
    const body = parsed.data;
    const memberIds = [...new Set(body.memberIds)];

    // Work out whether the run charges cards, and check what it targets belongs to this location.
    let paid = body.action === "charge";
    const input: Partial<BulkRunInput> = {};
    if (body.action === "register_event") {
        const [event, ticket] = await Promise.all([
            db.query.locationEvents.findFirst({
                where: and(eq(locationEvents.id, body.eventId), eq(locationEvents.locationId, lid)),
                columns: { id: true, status: true, endsAt: true },
            }),
            db.query.eventTickets.findFirst({
                where: and(eq(eventTickets.id, body.ticketId), eq(eventTickets.eventId, body.eventId)),
                columns: { id: true, status: true, pricingMethod: true, price: true },
            }),
        ]);
        if (!event || event.status !== "published" || event.endsAt.getTime() <= Date.now()) {
            throw new BulkRunError(400, "Choose a published event that hasn't ended");
        }
        if (!ticket || ticket.status !== "active") {
            throw new BulkRunError(400, "Choose an active ticket for this event");
        }
        paid = ticket.pricingMethod !== "free" && ticket.price > 0;
        // The worker refuses to charge if the price differs from what was approved here.
        Object.assign(input, { eventId: body.eventId, ticketId: body.ticketId, unitPrice: paid ? ticket.price : 0 });
    }
    if (body.action === "enroll_course") {
        const course = await db.query.courses.findFirst({
            where: and(eq(courses.id, body.courseId), eq(courses.locationId, lid)),
            columns: { id: true, status: true, price: true },
        });
        if (!course || course.status !== "published") {
            throw new BulkRunError(400, "Choose a published course");
        }
        paid = course.price > 0;
        // The worker refuses to charge if the price differs from what was approved here.
        Object.assign(input, { courseId: body.courseId, unitPrice: course.price });
    }
    if (body.action === "charge") {
        Object.assign(input, { amount: body.amount, item: body.item, ...(body.description ? { description: body.description } : {}) });
    }

    const required: LocationPermission[] = body.action === "resend_invite" || body.action === "archive"
        ? ["manage members"]
        : body.action === "charge"
            ? ["manage billing"]
            : paid ? ["manage events", "manage billing"] : ["manage events"];
    if (!await hasLocationPermissions(lid, actor, required)) {
        throw new BulkRunError(403, "You don't have permission to run this action");
    }
    if (paid && memberIds.length > PAID_MEMBER_LIMIT) {
        throw new BulkRunError(400, `Paid actions can run on up to ${PAID_MEMBER_LIMIT} members at a time`);
    }
    if (paid && "includeNonDefaultCards" in body) {
        const gateway = await getPaymentGatewayMode(lid).catch(() => "manual" as const);
        if (gateway === "manual") {
            throw new BulkRunError(400, "Connect a payment gateway before running paid actions");
        }
        // Square never marks a default card, so every member would be skipped without this.
        input.includeNonDefaultCards = gateway === "square" ? true : body.includeNonDefaultCards;
    }

    const inLocation = await db.select({ memberId: memberLocations.memberId }).from(memberLocations)
        .where(and(eq(memberLocations.locationId, lid), inArray(memberLocations.memberId, memberIds)));
    if (inLocation.length !== memberIds.length) {
        throw new BulkRunError(400, "Some selected members are not in this location. Refresh and try again.");
    }

    const createdBy = actor.userRole === "staff" ? actor.staffId : actor.vendorId;
    if (!createdBy) throw new BulkRunError(403, "Your account has no vendor or staff identity");
    const creator = actor.userId
        ? await db.query.users.findFirst({ where: eq(users.id, actor.userId), columns: { name: true } })
        : undefined;

    const run = await db.transaction(async (tx) => {
        const [created] = await tx.insert(memberBulkRuns).values({
            locationId: lid,
            action: body.action,
            input,
            total: memberIds.length,
            createdBy,
            createdByName: creator?.name ?? null,
        }).returning({ id: memberBulkRuns.id });
        if (!created) throw new Error("Bulk run was not created");
        await tx.insert(memberBulkRunItems).values(memberIds.map((memberId) => ({ runId: created.id, memberId })));
        return created;
    });

    try {
        await bulkRunQueue.add("run", { runId: run.id });
    } catch (error) {
        // Without a job the run would wait forever, so remove it and let staff retry.
        await db.delete(memberBulkRuns).where(eq(memberBulkRuns.id, run.id));
        throw error;
    }
    return run;
}
