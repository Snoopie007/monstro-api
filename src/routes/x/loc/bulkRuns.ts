import { Elysia } from "elysia";
import {
    handleCancelBulkRun,
    handleCreateBulkRun,
    handleGetBulkRun,
    handleListBulkRuns,
    mapBulkRunError,
    type BulkRunActor,
} from "@/handlers/bulkRun";
import { hasLocationPermissions } from "@/utils/locationAccess";

const forbidden = { error: "Forbidden", code: "FORBIDDEN" };

/**
 * Bulk member runs for the vendor portal: start one, list them, read one and cancel one.
 * These routes save and read rows, and queue one job per run. The worker (apps/workers, src/jobs/bulkRuns.ts) runs the members.
 */
export const xBulkRuns = new Elysia({ prefix: "/bulk-runs" })
    .get("/", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        if (!await hasLocationPermissions(lid, ctx, ["view members"])) return ctx.status(403, forbidden);
        try {
            return await handleListBulkRuns(lid, ctx.query);
        } catch (error) {
            return mapBulkRunError(ctx.status, error, "Failed to load bulk runs");
        }
    })
    .post("/", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        try {
            // Each action needs its own permission, so the handler checks it once it knows the action.
            const run = await handleCreateBulkRun({ lid, actor: ctx as BulkRunActor, body: ctx.body });
            return ctx.status(201, run);
        } catch (error) {
            return mapBulkRunError(ctx.status, error, "Failed to start the bulk action. Please retry.");
        }
    })
    .get("/:runId", async (ctx) => {
        const { lid, runId } = ctx.params as { lid: string; runId: string };
        if (!await hasLocationPermissions(lid, ctx, ["view members"])) return ctx.status(403, forbidden);
        try {
            return await handleGetBulkRun(lid, runId);
        } catch (error) {
            return mapBulkRunError(ctx.status, error, "Failed to load bulk run");
        }
    })
    .post("/:runId/cancel", async (ctx) => {
        const { lid, runId } = ctx.params as { lid: string; runId: string };
        if (!await hasLocationPermissions(lid, ctx, ["manage members"])) return ctx.status(403, forbidden);
        try {
            return await handleCancelBulkRun(lid, runId);
        } catch (error) {
            return mapBulkRunError(ctx.status, error, "Failed to cancel the run. Please retry.");
        }
    });
