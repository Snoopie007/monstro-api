import { db } from "@/db/db";
import type { memberBulkRunItems, memberBulkRuns } from "@/subtrees/schemas";

type BulkRun = typeof memberBulkRuns.$inferSelect;
type BulkItemStatus = (typeof memberBulkRunItems.$inferSelect)["status"];

/** The staff member or owner making the request, as AuthXMiddleware sets them on the context. */
export type BulkRunActor = { vendorId?: string; staffId?: string; userId?: string; userRole?: string };

/** What a run acts on, named for the run pages. */
type BulkRunTarget = {
    eventName: string | null;
    ticketName: string | null;
    ticketPrice: number | null;
    courseTitle: string | null;
    coursePrice: number | null;
};

/** One counter per member status, all at zero. */
export function emptyCounts(): Record<BulkItemStatus, number> {
    return { pending: 0, processing: 0, succeeded: 0, failed: 0, skipped: 0, needs_review: 0, canceled: 0 };
}

/** A run in the shape the vendor portal's run pages read. */
export function toRunSummary(run: BulkRun, counts: Record<BulkItemStatus, number>, target: BulkRunTarget) {
    return {
        id: run.id,
        action: run.action,
        status: run.status,
        total: run.total,
        input: run.input,
        createdByName: run.createdByName,
        created: run.created,
        started: run.started,
        finished: run.finished,
        counts,
        target,
    };
}

/**
 * How the location charges cards: "stripe", "square" or "authorize", or "manual" when no gateway
 * is connected. It uses the location's default gateway, or its only connected one.
 */
export async function getPaymentGatewayMode(lid: string): Promise<"stripe" | "square" | "authorize" | "manual"> {
    const [state, rows] = await Promise.all([
        db.query.locationState.findFirst({
            where: (table, { eq }) => eq(table.locationId, lid),
            columns: { paymentGatewayId: true },
        }),
        db.query.integrations.findMany({
            where: (table, { eq }) => eq(table.locationId, lid),
            columns: { id: true, service: true, accountId: true, metadata: true },
        }),
    ]);

    const connected = rows.filter((integration) => {
        if (integration.service === "square") {
            const metadata = integration.metadata as Record<string, unknown> | null;
            const squareLocationId = metadata?.squareLocationId;
            return metadata?.status === "connected" && typeof squareLocationId === "string" && squareLocationId.trim() !== "";
        }
        if (integration.service === "stripe" || integration.service === "authorize") {
            return Boolean(integration.accountId?.trim());
        }
        return false;
    });

    const gateway = connected.find((integration) => integration.id === state?.paymentGatewayId)
        ?? (connected.length === 1 ? connected[0] : undefined);
    if (gateway?.service === "stripe" || gateway?.service === "square" || gateway?.service === "authorize") {
        return gateway.service;
    }
    return "manual";
}
