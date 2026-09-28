import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@subtrees/schemas";

// Real database checks, independent of the one-active-run suppression rule.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("Stripe invoice decline workflow identity", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `stripe_failure_qa_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["transactions", "member_invoices", "workflows", "workflow_triggers", "workflow_queues", "members"];
    let handle: typeof import("./stripePlanCharge").handleStripePlanCharge;
    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        ({ handleStripePlanCharge: handle } = await import("./stripePlanCharge"));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into members (id,user_id,first_name,email) values ('member','user','QA','qa@example.invalid')`;
        await db.insert(schema.workflows).values({ id: "workflow", locationId: "location", name: "Payment Failed", status: "active", nodes: [
            { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
            { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
        ] });
        await db.insert(schema.workflowTriggers).values({ workflowId: "workflow", type: "payment::failed", data: { label: "Payment Failed" } });
        await db.insert(schema.transactions).values({ id: "txn", memberId: "member", locationId: "location", type: "inbound", paymentType: "card", status: "failed", paymentIntentId: "old-intent", failedCode: "card_declined", failedReason: "Old decline", total: 100, subTotal: 100 });
        await db.insert(schema.memberInvoices).values({ id: "invoice", memberId: "member", locationId: "location", transactionId: "txn", status: "unpaid", tax: 0, total: 100, subTotal: 100 });
    });
    const decline = (paymentIntentId = "new-intent") => handle({
        invoiceId: "invoice", memberPlanId: "pkg_qa", locationId: "location", memberId: "member",
        amount: 100, paymentType: "card", failedReason: "New decline", failedCode: "card_declined", success: false,
        receiptUrl: null, paymentMethodId: "method", paymentIntentId, feeAmount: 0,
    });

    test("new intent dispatches; its replay stays suppressed after that run completes", async () => {
        await decline();
        const [run] = await db.select().from(schema.workflowQueues);
        expect(run).toMatchObject({ workflowId: "workflow", memberId: "member", metadata: { trigger: { type: "payment::failed", transactionId: "txn" } } });
        expect((await db.select().from(schema.transactions))[0]).toMatchObject({ status: "failed", paymentIntentId: "new-intent", failedReason: "New decline" });
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        await decline();
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
        // Another genuinely different intent can still create a later run.
        await decline("third-intent");
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(2);
    });

    test("concurrent duplicate deliveries produce one run and later replay produces none", async () => {
        await Promise.all([decline(), decline()]);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        await decline();
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });

    test("the previous invoice failure is not dispatched again", async () => {
        await decline("old-intent");
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
        expect((await db.select().from(schema.memberInvoices))[0]).toMatchObject({ status: "unpaid", paid: false });
    });

    test("a failed dispatch rolls back the identity update so a later delivery can retry", async () => {
        await sql`alter table workflow_queues add constraint qa_reject_run check (member_id <> 'member')`;
        try {
            await expect(decline()).rejects.toThrow();
            expect((await db.select().from(schema.transactions))[0]?.paymentIntentId).toBe("old-intent");
            expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
        } finally { await sql`alter table workflow_queues drop constraint qa_reject_run`; }
        await decline();
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
});
