import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/db";
import { memberBulkRunItems, memberBulkRuns } from "@/subtrees/schemas";
import { BulkRunError } from "./errors";

/** Stops members that haven't started. A member the worker is already running finishes normally. */
export async function handleCancelBulkRun(lid: string, runId: string) {
    const canceled = await db.transaction(async (tx) => {
        const now = new Date();
        const [run] = await tx.update(memberBulkRuns)
            .set({ status: "canceled", finished: now, updated: now })
            .where(and(
                eq(memberBulkRuns.id, runId),
                eq(memberBulkRuns.locationId, lid),
                inArray(memberBulkRuns.status, ["queued", "running"]),
            ))
            .returning({ id: memberBulkRuns.id });
        if (!run) return null;
        await tx.update(memberBulkRunItems)
            .set({ status: "canceled", message: "Run was canceled", finished: now, updated: now })
            .where(and(eq(memberBulkRunItems.runId, run.id), eq(memberBulkRunItems.status, "pending")));
        return run;
    });
    if (!canceled) throw new BulkRunError(409, "This run has already finished");
    return { success: true };
}
