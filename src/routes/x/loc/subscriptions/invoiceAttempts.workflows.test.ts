import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("accepted billing outcomes and workflows", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `billing_workflow_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["member_invoices", "transactions", "members", "workflows", "workflow_triggers", "workflow_queues"];
    let save: typeof import("./invoiceAttempts").saveInvoiceAttemptResult;
    beforeAll(async () => {
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        await sql`alter table member_invoices add column if not exists renewal_key text`;
        mock.module("@/db/db", () => ({ db }));
        ({ saveInvoiceAttemptResult: save } = await import("./invoiceAttempts"));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into members (id,user_id,first_name,email) values ('member','user','QA','qa@example.invalid')`;
        await db.insert(schema.workflows).values({ id: "workflow", locationId: "location", name: "Decline", status: "active", nodes: [
            { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
            { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
        ] });
        await db.insert(schema.workflowTriggers).values({ workflowId: "workflow", type: "payment::failed", data: { label: "Decline" } });
        await db.insert(schema.transactions).values({ id: "txn", memberId: "member", locationId: "location", type: "inbound", status: "failed", paymentType: "card" });
        await db.insert(schema.memberInvoices).values({ id: "invoice", memberId: "member", locationId: "location", transactionId: "txn", status: "unpaid", tax: 0, total: 100, subTotal: 100, metadata: { billingAttempt: { id: "attempt", status: "in_flight", paymentType: "card" } } });
    });
    const decline = (workflowDecline: boolean, attemptId = "attempt") => save({ invoiceId: "invoice", attemptId, status: "failed", paymentIntentId: "pi_declined", workflowDecline });
    test("accepted provider decline creates the workflow with its durable attempt outcome", async () => {
        await decline(true);
        expect((await db.select().from(schema.workflowQueues))[0]).toMatchObject({ memberId: "member", metadata: { trigger: { type: "payment::failed", transactionId: "txn" } } });
        expect((await db.select().from(schema.memberInvoices))[0]?.metadata).toMatchObject({ billingAttempt: { id: "attempt", status: "failed" } });
    });
    test.each(["stale attempt", "paid invoice", "succeeded attempt"])("rejects %s without dispatch", async kind => {
        if (kind === "paid invoice") await db.update(schema.memberInvoices).set({ paid: true, status: "paid" });
        if (kind === "succeeded attempt") await db.update(schema.memberInvoices).set({ metadata: { billingAttempt: { id: "attempt", status: "succeeded" } } });
        await decline(true, kind === "stale attempt" ? "old-attempt" : "attempt");
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
        const [invoice] = await db.select().from(schema.memberInvoices);
        if (kind === "paid invoice") expect(invoice).toMatchObject({ paid: true, status: "paid" });
        else expect(invoice?.metadata).toMatchObject({ billingAttempt: { status: kind === "succeeded attempt" ? "succeeded" : "in_flight" } });
    });
    test("internal/configuration failure is not a payment-decline event", async () => {
        await decline(false);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
    });
    test("concurrent saves retain one active run", async () => {
        await Promise.all([decline(true), decline(true)]);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
    test("workflow SQL failure rolls back the attempt result and can retry", async () => {
        await sql`alter table workflow_queues add constraint reject_workflow check (member_id <> 'member')`;
        try {
            await expect(decline(true)).rejects.toThrow();
            expect((await db.select().from(schema.memberInvoices))[0]?.metadata).toMatchObject({ billingAttempt: { status: "in_flight" } });
        } finally { await sql`alter table workflow_queues drop constraint reject_workflow`; }
        await decline(true);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
});
