import { afterAll, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia } from "elysia";
import * as schema from "@/subtrees/schemas";

// Run separately from mock-only suites. Real HTTP, production handlers/dispatcher,
// and Postgres savepoints; payment approval and authenticated identity are simulated.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("paid purchase workflow isolation", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `paid_workflow_qa_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["transactions", "location_events", "event_tickets", "event_registrations", "orders", "products", "product_variants", "members", "workflows", "workflow_triggers", "workflow_queues"];
    let stopServer: (() => Promise<void>) | undefined;
    let baseUrl: string;
    let chargeCount = 0;
    const logged = spyOn(console, "error").mockImplementation(() => {});

    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        // Local schema drift: add only the checkout column to our disposable copy.
        await sql`alter table product_variants add column if not exists sale_price integer`;
        mock.module("@/db/db", () => ({ db }));
        const { calculateOrderTotals } = await import("@/utils/orderUtils");
        const { calculateChargeDetails } = await import("@/utils/enrollUtils");
        class CheckoutError extends Error { constructor(public status: number, message: string) { super(message); } }
        mock.module("@/utils", () => ({
            CheckoutError, CheckoutPendingError: CheckoutError, PaymentChargeError: CheckoutError,
            calculateOrderTotals, calculateChargeDetails,
            getCheckoutContext: async () => ({ gatewayCustomerId: "qa-customer", gateway: { service: "stripe" }, locationState: { currency: "USD", planId: 2 }, taxRates: [] }),
            getAdditionalFeesForCheckout: async () => [],
            chargeWithGateway: async () => {
                chargeCount++;
                return { status: "approved", paymentIntentId: "qa-approved", paymentType: "card", gatewayMetadata: { gatewayService: "stripe" } };
            },
            handleSquareError: () => ({ message: "QA provider error" }),
            handleStripeError: () => ({ message: "QA provider error" }),
        }));
        const { locationMercsCheckout } = await import("../../routes/protected/locations/mercs/checkout");
        const { locationEventRoutes } = await import("../../routes/protected/locations/events");
        const app = new Elysia().decorate("memberId", "member")
            .group("/locations/:lid", (app) => app.use(locationMercsCheckout).use(locationEventRoutes));
        await app.listen({ hostname: "127.0.0.1", port: 0 });
        stopServer = async () => { await app.stop(); };
        baseUrl = `http://127.0.0.1:${app.server!.port}`;
    });
    afterAll(async () => {
        await stopServer?.();
        logged.mockRestore();
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        chargeCount = 0;
        logged.mockClear();
        await sql`insert into members (id,user_id,first_name,email) values ('member','qa-user','QA','qa@example.invalid')`;
        await sql`insert into products (id,location_id,slug,name) values ('product','location','qa-product','QA product')`;
        await sql`insert into product_variants (id,product_id,sku,price,stock) values ('variant','product','qa',100,10)`;
        await db.insert(schema.locationEvents).values({ id: "event", locationId: "location", name: "QA event", status: "published", startsAt: new Date(), endsAt: new Date(Date.now() + 3600000), capacity: 10 });
        await db.insert(schema.eventTickets).values({ id: "ticket", eventId: "event", name: "QA ticket", quantity: 10, price: 100, pricingMethod: "fixed", status: "active" });
        for (const type of ["event::registered", "order::created"]) {
            await db.insert(schema.workflows).values({ id: type, locationId: "location", name: type, status: "active", nodes: [
                { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
                { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
            ] });
            await db.insert(schema.workflowTriggers).values({ id: type, workflowId: type, type, data: { label: type } });
        }
    });
    async function purchase(kind: "order" | "event", free = false) {
        return fetch(baseUrl + "/locations/location/" + (kind === "order" ? "mercs/checkout" : "events/event/register" + (free ? "/free" : "")), {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mid: "member", paymentMethodId: "qa-method", ticketId: "ticket", items: [{ variantId: "variant", quantity: 1 }] }),
        });
    }
    async function state(kind: "order" | "event", response: Response) {
        const body = await response.json();
        const payments = await sql`select status from transactions`;
        const purchases = kind === "order" ? await sql`select status from orders` : await sql`select status from event_registrations`;
        const inventory = kind === "order" ? await sql`select stock as remaining from product_variants` : await sql`select quantity as remaining from event_tickets`;
        const runs = await sql`select metadata from workflow_queues`;
        const result = { http: response.status, charges: chargeCount, payments: payments.map(p => p.status), purchases: purchases.map(p => p.status), remaining: inventory[0]!.remaining, runs: runs.length, dispatchErrors: logged.mock.calls.filter(call => String(call[0]).startsWith("[Workflow]")).length };
        if (process.env.WORKFLOW_QA_REPORT === "1") console.log(JSON.stringify({ kind, ...result }));
        return { ...result, body, runRows: runs };
    }

    for (const kind of ["order", "event"] as const) {
        test(`${kind}: successful purchase still creates its workflow`, async () => {
            const saved = await state(kind, await purchase(kind));
            expect(saved).toMatchObject({ http: kind === "order" ? 200 : 201, charges: 1, payments: ["paid"], purchases: [kind === "order" ? "paid" : "registered"], remaining: 9, runs: 1, dispatchErrors: 0 });
            expect(saved.runRows[0]!.metadata.trigger.type).toBe(kind === "order" ? "order::created" : "event::registered");
        });
        test(`${kind}: rejected workflow SQL preserves paid purchase and inventory`, async () => {
            await sql`alter table workflow_queues add constraint qa_reject_run check (member_id <> 'member')`;
            try {
                expect(await state(kind, await purchase(kind))).toMatchObject({ http: kind === "order" ? 200 : 201, charges: 1, payments: ["paid"], purchases: [kind === "order" ? "paid" : "registered"], remaining: 9, runs: 0, dispatchErrors: 1 });
            } finally { await sql`alter table workflow_queues drop constraint qa_reject_run`; }
        });
        test(`${kind}: failure on a second workflow rolls back the first run only`, async () => {
            const type = kind === "order" ? "order::created" : "event::registered";
            const [original] = await db.select().from(schema.workflows);
            await db.insert(schema.workflows).values({ id: "second", locationId: "location", name: "Second", status: "active", nodes: original!.nodes });
            await db.insert(schema.workflowTriggers).values({ id: "second", workflowId: "second", type, data: { label: "Second" } });
            // Reject the second insert regardless of query order, proving partial dispatch rolls back.
            await sql.unsafe(`create function qa_reject_second() returns trigger language plpgsql as $$ begin if exists (select 1 from workflow_queues) then raise exception 'QA second run failure'; end if; return new; end $$`);
            await sql.unsafe("create trigger qa_second before insert on workflow_queues for each row execute function qa_reject_second()");
            try {
                expect(await state(kind, await purchase(kind))).toMatchObject({ http: kind === "order" ? 200 : 201, payments: ["paid"], remaining: 9, runs: 0, dispatchErrors: 1 });
            } finally { await sql.unsafe("drop trigger qa_second on workflow_queues"); await sql.unsafe("drop function qa_reject_second()"); }
        });
        test(`${kind}: disabled workflows do not affect paid checkout`, async () => {
            await db.update(schema.workflows).set({ status: "draft" });
            expect(await state(kind, await purchase(kind))).toMatchObject({ http: kind === "order" ? 200 : 201, payments: ["paid"], runs: 0, dispatchErrors: 0 });
        });
    }
    test("free registration keeps its existing rollback policy", async () => {
        await db.update(schema.eventTickets).set({ pricingMethod: "free", price: 0 });
        await sql`alter table workflow_queues add constraint qa_reject_run check (member_id <> 'member')`;
        try {
            expect(await state("event", await purchase("event", true))).toMatchObject({ http: 500, charges: 0, payments: [], purchases: [], remaining: 10, runs: 0, dispatchErrors: 0 });
        } finally { await sql`alter table workflow_queues drop constraint qa_reject_run`; }
    });
});
