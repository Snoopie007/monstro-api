import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia } from "elysia";
import * as schema from "@subtrees/schemas";

// The routes, transaction writes, and dispatcher are real. No gateway/Redis calls leave this suite.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("Trial Checkout with local Postgres", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `trial_workflow_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` } });
    const db = drizzle(sql, { schema });
    const tables = ["locations", "location_state", "tax_rates", "integrations", "members", "member_locations",
        "member_plans", "member_plan_pricing", "member_subscriptions", "member_invoices", "transactions",
        "member_packages", "member_passes", "workflows", "workflow_triggers", "workflow_queues"];
    let app: Pick<Elysia, "handle">;
    let enroll: typeof import("./sub")["handleEnrollSubscription"];
    let schedulingFails = false;
    let chargeState: "approved" | "failed" | "uncertain" = "approved";
    let chargeAmount = 1000;
    const schedule = async () => { if (schedulingFails) throw new Error("Scheduler unavailable"); };
    class CheckoutError extends Error {
        constructor(public status: number, message: string) { super(message); }
    }
    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@/utils", () => ({
            CheckoutError,
            calculateThresholdDate: ({ startDate }: { startDate: Date }) => new Date(startDate.getTime() + 30 * 86400000),
            calculateChargeDetails: () => ({ total: chargeAmount, subTotal: chargeAmount, tax: 0, feesAmount: 0, unitCost: chargeAmount, productDiscount: 0, discount: 0, additionalFeeLines: [] }),
            getAdditionalFeesForCheckout: async () => [],
            getCurrency: () => "USD",
            fetchPromoDiscount: async () => undefined,
            createEnrollUnsignedDocs: async () => [],
            recoverEnrollUnsignedDocs: async () => [],
            triggerPurchase: async () => undefined,
            getCheckoutContext: async () => ({
                ml: { member: { userId: "user", firstName: "Test", lastName: null, email: "test@example.invalid" },
                    location: { name: "Test", taxRates: [], locationState: { planId: 2, currency: "USD", waiverId: null } } },
                gateway: { service: "stripe" }, taxRates: [], gatewayCustomerId: "cus_test",
            }),
            chargeWithGateway: async () => {
                if (chargeState === "failed") return { status: "failed", failureCode: "card_declined", failureReason: "Declined", gatewayMetadata: { gatewayService: "stripe" } };
                if (chargeState === "uncertain") return { status: "uncertain", message: "Unknown outcome", gatewayMetadata: {} };
                return { status: "approved", paymentIntentId: "payment_" + crypto.randomUUID(), gatewayMetadata: {} };
            },
        }));
        mock.module("@/libs/PaymentGateway", () => ({
            StripePaymentGateway: class { createChargeWithoutLineItems = async () => { throw new Error("No real charge allowed"); }; },
            SquarePaymentGateway: class {},
        }));
        mock.module("@/queues/subscriptions", () => ({
            removeRenewalJobs: async () => {}, scheduleCronBasedRenewal: schedule, scheduleRecursiveRenewal: schedule,
        }));
        mock.module("@/libs/broadcast/achievements", () => ({ broadcastAchievement: () => {} }));
        const { activateSubscriptionRoutes } = await import("../../routes/x/loc/subscriptions/activate");
        const { activateCashSubscriptionRoutes } = await import("../../routes/x/loc/subscriptions/activateCash");
        const { createSubscriptionRoutes } = await import("../../routes/x/loc/subscriptions/create");
        const { locationPass } = await import("../../routes/protected/locations/pass");
        enroll = (await import("./sub")).handleEnrollSubscription;
        app = new Elysia()
            .group("/locations/:lid/subscriptions", app => app.use(createSubscriptionRoutes).use(activateSubscriptionRoutes).use(activateCashSubscriptionRoutes))
            .group("/locations/:lid", app => app.use(locationPass));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        schedulingFails = false; chargeState = "approved"; chargeAmount = 1000;
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into locations(id,name,slug,vendor_id,timezone,country) values('location','Trial School','trial-school','vendor','UTC','US')`;
        await sql`insert into location_state(location_id,plan_id,payment_gateway_id) values('location',2,'gateway')`;
        await sql`insert into integrations(id,location_id,service,account_id,access_token) values('gateway','location','stripe','acct_test','test-disabled')`;
        await sql`insert into members(id,user_id,first_name,email) values('member','user','Test','test@example.invalid')`;
        await sql`insert into member_locations(member_id,location_id,status,gateway_customer_id) values('member','location','active','cus_test')`;
        await sql`insert into member_plans(id,name,description,location_id,type) values('plan','Membership','Test','location','recurring')`;
        await sql`insert into member_plan_pricing(id,member_plan_id,name,price,interval,interval_threshold) values('price','plan','Monthly',1000,'month',1)`;
        await sql`insert into member_subscriptions(id,member_id,location_id,member_plan_pricing_id,start_date,current_period_start,current_period_end,trial_end,status,payment_type) values('subscription','member','location','price',now(),now(),now()+interval '1 month',now()+interval '7 days','trialing','card')`;
        await sql`insert into member_passes(id,plan_id,location_id,referrer_id) values('pass','plan','location','other-member')`;
        for (const locationId of ["location", "elsewhere"]) {
            await db.insert(schema.workflows).values({ id: locationId, locationId, name: "Trial", status: "active", nodes: [
                { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
                { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
            ] });
            await db.insert(schema.workflowTriggers).values({ id: locationId, workflowId: locationId, type: "trial::checked_out", data: { label: "Trial Checkout" } });
        }
    });
    const post = (path: string, body: unknown = {}) => app.handle(new Request("http://localhost/locations/location/" + path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    const activate = (paymentType = "card") => post("subscriptions/subscription/activate", { paymentMethodId: "pm_test", paymentType });
    const checkout = (trialDays = 7) => enroll({ lid: "location", mid: "member", priceId: "price", paymentMethodId: "pm_test", paymentType: "card", trialDays });
    const runs = () => db.select().from(schema.workflowQueues);

    test("saving an assigned trial creates no workflow before activation", async () => {
        expect((await post("subscriptions", { memberId: "member", pricingId: "price", paymentType: "cash", trialDays: 7 })).status).toBe(201);
        expect(await runs()).toHaveLength(0);
    });
    test.each(["card", "us_bank_account"])("%s trial activation creates a scoped, source-neutral workflow", async paymentType => {
        await sql`update member_subscriptions set payment_type=${paymentType}`;
        expect((await activate(paymentType)).status).toBe(200);
        expect(await runs()).toEqual([expect.objectContaining({
            workflowId: "location", memberId: "member", metadata: expect.objectContaining({ trigger: { type: "trial::checked_out" } }),
        })]);
    });
    test("failed scheduling does not emit; retry after recovery can succeed", async () => {
        schedulingFails = true;
        expect((await activate()).status).toBe(500);
        expect(await runs()).toHaveLength(0);
        schedulingFails = false;
        expect((await activate()).status).toBe(200);
        expect(await runs()).toHaveLength(1);
    });
    test("missing card setup emits nothing", async () => {
        await sql`update member_locations set gateway_customer_id=null`;
        expect((await activate()).status).toBe(400);
        expect(await runs()).toHaveLength(0);
    });
    test("cash trial activation requires no payment", async () => {
        await sql`update member_subscriptions set payment_type='cash'`;
        await sql`update member_locations set gateway_customer_id=null`;
        expect((await post("subscriptions/subscription/activate-cash")).status).toBe(200);
        expect(await runs()).toHaveLength(1);
        expect(await db.select().from(schema.transactions)).toHaveLength(0);
    });
    test("cash activation and workflow creation roll back together", async () => {
        await sql`update member_subscriptions set payment_type='cash',status='incomplete'`;
        await sql`alter table workflow_queues add constraint qa_reject_run check(member_id <> 'member')`;
        try {
            expect((await post("subscriptions/subscription/activate-cash")).status).toBe(500);
            expect((await db.select().from(schema.memberSubscriptions))[0]?.status).toBe("incomplete");
            expect(await runs()).toHaveLength(0);
        } finally { await sql`alter table workflow_queues drop constraint qa_reject_run`; }
    });
    test("a cash subscription without a trial does not emit", async () => {
        await sql`update member_subscriptions set trial_end=null,payment_type='cash'`;
        await sql`insert into member_invoices(id,member_id,location_id,member_plan_id,status,tax,subtotal,total) values('draft','member','location','subscription','draft',0,1000,1000)`;
        expect((await post("subscriptions/subscription/activate-cash")).status).toBe(200);
        expect(await runs()).toHaveLength(0);
    });
    test.each(["card", "cash"])("family child %s activation does not count as a new checkout", async type => {
        await sql`update member_subscriptions set parent_id='parent',payment_type=${type}`;
        expect((await (type === "card" ? activate() : post("subscriptions/subscription/activate-cash"))).status).toBe(200);
        expect(await runs()).toHaveLength(0);
    });
    test.each([1000, 0])("successful trial enrollment at amount %s emits after setup", async amount => {
        chargeAmount = amount;
        await checkout();
        expect(await runs()).toHaveLength(1);
    });
    test("failed trial-enrollment scheduling creates no workflow", async () => {
        schedulingFails = true;
        await expect(checkout()).rejects.toMatchObject({ status: 202, message: expect.stringContaining("do not repeat checkout") });
        expect(await runs()).toHaveLength(0);
        expect(await db.select().from(schema.transactions)).toHaveLength(1);
    });
    test("backdated enrollment with an expired trial does not emit", async () => {
        await enroll({ lid: "location", mid: "member", priceId: "price", paymentMethodId: "pm_test", paymentType: "card", trialDays: 7, startDate: "2020-01-01" });
        expect(await runs()).toHaveLength(0);
    });
    test("ordinary enrollment is not a Trial Checkout", async () => {
        await checkout(0);
        expect(await runs()).toHaveLength(0);
    });
    test("a trial quote saves no payment and emits nothing", async () => {
        await enroll({ lid: "location", mid: "member", priceId: "price", paymentMethodId: "quote", paymentType: "card", trialDays: 7, quoteOnly: true });
        expect(await db.select().from(schema.transactions)).toHaveLength(0);
        expect(await runs()).toHaveLength(0);
    });
    test.each(["failed", "uncertain"] as const)("payment outcome %s creates no trial workflow", async state => {
        chargeState = state;
        await expect(checkout()).rejects.toThrow();
        expect(await runs()).toHaveLength(0);
    });
    test("a referral pass activates a package and emits; a repeat does not", async () => {
        expect((await post("passes/pass/claim", { memberId: "member" })).status).toBe(200);
        expect(await db.select().from(schema.memberPackages)).toHaveLength(1);
        expect(await runs()).toHaveLength(1);
        await db.update(schema.workflowQueues).set({ stopped: "completed" });
        expect((await post("passes/pass/claim", { memberId: "member" })).status).toBe(400);
        expect(await runs()).toHaveLength(1);
    });
    test("workflow failure rolls back pass claim and its package", async () => {
        await sql`alter table workflow_queues add constraint qa_reject_run check(member_id <> 'member')`;
        try {
            expect((await post("passes/pass/claim", { memberId: "member" })).status).toBe(500);
            expect(await db.select().from(schema.memberPackages)).toHaveLength(0);
            expect((await db.select().from(schema.memberPasses))[0]?.claimedBy).toBeNull();
        } finally { await sql`alter table workflow_queues drop constraint qa_reject_run`; }
    });
    test("two simultaneous pass claims create only one package and workflow", async () => {
        const responses = await Promise.all([
            post("passes/pass/claim", { memberId: "member" }),
            post("passes/pass/claim", { memberId: "member" }),
        ]);
        expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
        expect(await db.select().from(schema.memberPackages)).toHaveLength(1);
        expect(await runs()).toHaveLength(1);
    });
});
