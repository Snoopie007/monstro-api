import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia } from "elysia";
import * as schema from "@subtrees/schemas";

// Run separately from mock-only checkout suites. These writes and dispatches use real Postgres.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("registration and order workflow transactions", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `commerce_workflow_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` } });
    const db = drizzle(sql, { schema });
    const tables = ["location_events", "event_tickets", "event_registrations", "orders", "products", "product_variants", "members", "workflows", "workflow_triggers", "workflow_queues"];
    let helpers: typeof import("./shared");
    let app: Pick<Elysia, "handle">;
    let event: typeof schema.locationEvents.$inferSelect;
    let ticket: typeof schema.eventTickets.$inferSelect;
    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@/utils", () => ({ getCheckoutContext: async () => { throw new Error("No payment calls in these tests"); } }));
        mock.module("@/utils/orderEmailNotifications", () => ({ queueOrderPaidNotifications: async () => {}, queueOrderStatusUpdateNotification: async () => {} }));
        helpers = await import("./shared");
        const { orderRoutes } = await import("../../routes/x/loc/merchandise/orders");
        app = new Elysia().decorate("merchandiseLocationAccess", { allowed: true })
            .group("/locations/:lid", app => app.use(orderRoutes));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        const events = await db.insert(schema.locationEvents).values({
            id: "event", locationId: "location", name: "Event", startsAt: new Date(), endsAt: new Date(Date.now() + 3600000), capacity: 10,
        }).returning();
        event = events[0]!;
        ticket = (await db.insert(schema.eventTickets).values({ id: "ticket", eventId: event.id, name: "Ticket", quantity: 10 }).returning())[0]!;
        await sql`insert into members (id,user_id,first_name,email) values ('member','user','Test','test@example.invalid')`;
        await sql`insert into products (id,location_id,slug,name) values ('product','location','product','Product')`;
        await sql`insert into product_variants (id,product_id,sku,price,stock) values ('variant','product','test',100,10)`;
        for (const type of ["event::registered", "order::created"]) {
            for (const locationId of ["location", "elsewhere"]) {
                const id = type + locationId;
                await db.insert(schema.workflows).values({ id, locationId, name: type, status: "active", nodes: [
                    { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
                    { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
                ] });
                await db.insert(schema.workflowTriggers).values({ id, workflowId: id, type, data: { label: type } });
            }
        }
    });
    const register = (pending = false) => db.transaction(tx => helpers.createEventRegistration(tx, {
        lid: "location", mid: "member", event, ticket, transactionId: "transaction", registrationId: "registration",
        status: pending ? "pending" : "registered",
    }));
    const order = () => app.handle(new Request("http://localhost/locations/location/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "member", items: [{ variantId: "variant", quantity: 1 }] }),
    }));

    test("confirmed registration saves its event payload only for this location", async () => {
        await register();
        const runs = await db.select().from(schema.workflowQueues);
        expect(runs).toHaveLength(1);
        expect(runs[0]).toMatchObject({
            memberId: "member", workflowId: "event::registeredlocation",
            metadata: { trigger: { type: "event::registered", eventId: "event", registrationId: "registration" } },
        });
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        await expect(register()).rejects.toThrow("already registered");
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
    test("pending confirmation dispatches once even after the run completes", async () => {
        await register(true);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
        await db.transaction(tx => helpers.completePendingEventRegistration(tx, "transaction"));
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        expect(await db.transaction(tx => helpers.completePendingEventRegistration(tx, "transaction"))).toBeUndefined();
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
    test("concurrent pending confirmations start one run", async () => {
        await register(true);
        await Promise.all([1, 2].map(() => db.transaction(tx => helpers.completePendingEventRegistration(tx, "transaction"))));
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
    test("cancelled registrations cannot become confirmed through the pending helper", async () => {
        await register(true);
        await db.update(schema.eventRegistrations).set({ status: "cancelled" });
        expect(await db.transaction(tx => helpers.completePendingEventRegistration(tx, "transaction"))).toBeUndefined();
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(0);
    });
    test("workflow failure rolls back registration and ticket inventory", async () => {
        await sql`alter table workflow_queues add constraint test_reject_run check (member_id <> 'member')`;
        try {
            await expect(register()).rejects.toThrow();
            expect(await db.select().from(schema.eventRegistrations)).toHaveLength(0);
            expect((await db.select().from(schema.eventTickets))[0]?.quantity).toBe(10);
        } finally { await sql`alter table workflow_queues drop constraint test_reject_run`; }
    });
    test("unpaid vendor order creates one run; marking paid does not create another", async () => {
        const response = await order();
        expect(response.status).toBe(201);
        const [created] = await db.select().from(schema.orders);
        expect(created?.status).toBe("pending");
        const runs = await db.select().from(schema.workflowQueues);
        expect(runs).toHaveLength(1);
        expect(runs[0]).toMatchObject({ workflowId: "order::createdlocation", metadata: { trigger: { type: "order::created", orderId: created?.id } } });
        expect((await sql`select stock from product_variants`)[0]?.stock).toBe(9);
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        const { markOrderPaid } = await import("../../routes/x/loc/merchandise/shared");
        await markOrderPaid(created!.id);
        expect(await db.select().from(schema.workflowQueues)).toHaveLength(1);
    });
    test("workflow failure rolls back vendor order and stock", async () => {
        await sql`alter table workflow_queues add constraint test_reject_run check (member_id <> 'member')`;
        try {
            expect((await order()).status).toBe(500);
            expect(await db.select().from(schema.orders)).toHaveLength(0);
            expect((await sql`select stock from product_variants`)[0]?.stock).toBe(10);
        } finally { await sql`alter table workflow_queues drop constraint test_reject_run`; }
    });
});
