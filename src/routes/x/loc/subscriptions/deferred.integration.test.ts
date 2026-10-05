import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, setSystemTime, test } from "bun:test";
import { Elysia } from "elysia";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

const url = process.env.BILLING_TEST_DATABASE_URL;
describe.skipIf(!url)("deferred enrollment", () => {
    const namespace = `deferred_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    const sql = postgres(url!, { max: 3, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["member_subscriptions", "member_plan_pricing", "member_plans", "members", "member_locations", "locations", "location_state", "tax_rates", "member_invoices", "transactions"];
    const schedule = mock(async (..._args: unknown[]) => ({}));
    let app: Pick<Elysia, "handle">;
    const request = (path: string, body: unknown) => app.handle(new Request(`http://localhost/loc/loc/subscriptions${path}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    const enrollment = () => ({ memberId: "member", pricingId: "price", paymentType: "cash",
        startDate: "2090-10-03", firstPaymentDate: "2090-10-15", delayFirstPayment: true,
        prorateBeforeFirstPayment: true, enrollmentAttemptId: crypto.randomUUID() });
    beforeAll(async () => {
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url!).hostname)) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        const { calculateThresholdDate } = await import("@/utils/enrollUtils");
        mock.module("@/utils", () => ({ calculateThresholdDate }));
        mock.module("@/utils/additionalFees", () => ({ getAdditionalFeesForCheckout: async () => [] }));
        mock.module("@/queues/subscriptions", () => ({
            scheduleCashRenewal: schedule, removeRenewalJobs: async () => {},
            scheduleCronBasedRenewal: async () => {}, scheduleRecursiveRenewal: async () => {},
        }));
        const { createSubscriptionRoutes } = await import("./create");
        const { activateCashSubscriptionRoutes } = await import("./activateCash");
        const { resumeSubscriptionRoutes } = await import("./resume");
        const resume = await resumeSubscriptionRoutes(new Elysia());
        const create = await createSubscriptionRoutes(new Elysia());
        const activate = await activateCashSubscriptionRoutes(new Elysia());
        app = new Elysia().group("/loc/:lid/subscriptions", group => group.use(create).use(activate).use(resume));
    });
    afterAll(async () => { await sql.end(); await admin`drop schema if exists ${admin(namespace)} cascade`; await admin.end(); });
    afterEach(() => setSystemTime());
    beforeEach(async () => {
        schedule.mockClear();
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into members (id,user_id,first_name,last_name,email) values ('member','user','Sample','Member','sample@example.test')`;
        await sql`insert into locations (id,name,slug,vendor_id,country,timezone,email) values ('loc','Billing test','billing-test','vendor','US','America/New_York','vendor@example.test')`;
        await sql`insert into member_locations (member_id,location_id) values ('member','loc')`;
        await sql`insert into location_state (location_id,plan_id,status) values ('loc',2,'active')`;
        await sql`insert into member_plans (id,name,description,location_id,type) values ('plan','Monthly','Monthly','loc','recurring')`;
        await sql`insert into member_plan_pricing (id,member_plan_id,name,price,interval,interval_threshold) values ('price','plan','Monthly',10000,'month',1)`;
    });
    test("preview adds proration to the first payment and creates no debt or enrollment", async () => {
        const response = await request("/", { ...enrollment(), previewOnly: true });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ billingPreview: { dueToday: 0, prorationAmount: 4000, firstChargeTotal: 14000 } });
        expect(await db.select().from(schema.memberSubscriptions)).toHaveLength(0);
        expect(await db.select().from(schema.memberInvoices)).toHaveLength(0);
    });
    test("explicit opt-in is required", async () => {
        expect((await request("/", { ...enrollment(), delayFirstPayment: false })).status).toBe(400);
    });
    test("concurrent retries create one draft, then activate access without an invoice", async () => {
        const body = enrollment();
        const responses = await Promise.all([request("/", body), request("/", body)]);
        expect(responses.every(response => [200, 201].includes(response.status))).toBe(true);
        const rows = await db.select().from(schema.memberSubscriptions);
        expect(rows).toHaveLength(1);
        const sub = rows[0]!;
        expect(sub.metadata.deferredBilling).not.toHaveProperty("timezone");
        expect(sub.metadata.deferredBilling).not.toHaveProperty("accessStartDate");
        expect(sub.currentPeriodEnd.toISOString()).toBe("2090-10-15T13:00:00.000Z");
        const activated = await request(`/${sub.id}/activate-cash`, {});
        expect(activated.status).toBe(200);
        expect((await db.select().from(schema.memberSubscriptions))[0]?.status).toBe("active");
        expect(await db.select().from(schema.memberInvoices)).toHaveLength(0);
        expect(schedule).toHaveBeenCalledTimes(1);
        expect(schedule.mock.calls[0]?.[0]).toEqual(new Date("2090-10-15T13:00:00.000Z"));
        expect(schedule.mock.calls[0]?.[1]).toMatchObject({ sid: sub.id, lid: "loc", vendorId: "vendor" });
    });
    test("changing the billing policy cannot reuse an attempt", async () => {
        const body = enrollment();
        expect((await request("/", body)).status).toBe(201);
        expect((await request("/", { ...body, prorateBeforeFirstPayment: false })).status).toBe(409);
    });
    test("ordinary trial enrollment retains its existing period and proration setting", async () => {
        const response = await request("/", {
            memberId: "member", pricingId: "price", paymentType: "cash", startDate: "2090-10-03T00:00:00Z",
            trialDays: 7, allowProration: true,
        });
        expect(response.status).toBe(201);
        const [sub] = await db.select().from(schema.memberSubscriptions);
        expect(sub).toMatchObject({ status: "trialing", metadata: { allowProration: true } });
        expect(sub!.metadata.deferredBilling).toBeUndefined();
        expect(sub!.trialEnd?.toISOString()).toBe("2090-10-10T00:00:00.000Z");
        expect(await db.select().from(schema.memberInvoices)).toHaveLength(0);
    });
    test("resume preserves proration when the pause ends before access starts", async () => {
        await request("/", { ...enrollment(), startDate: "2090-10-10" });
        const [sub] = await db.select().from(schema.memberSubscriptions);
        const deferredBilling = sub!.metadata.deferredBilling as Record<string, unknown>;
        await db.update(schema.memberSubscriptions).set({ status: "paused", metadata: {
            ...sub!.metadata, note: "retain", deferredBilling: { ...deferredBilling, accessStartDate: "2090-01-01", pausedAt: "2090-10-01T13:00:00Z" },
        } });
        setSystemTime(new Date("2090-10-02T13:00:00Z"));
        expect((await request(`/${sub!.id}/resume`, {})).status).toBe(200);
        expect((await db.select().from(schema.memberSubscriptions))[0]).toMatchObject({
            status: "active", currentPeriodEnd: sub!.currentPeriodEnd,
            metadata: { note: "retain", deferredBilling: { prorationAmount: deferredBilling.prorationAmount, pausedDays: 0, pausedAt: null } },
        });
        expect(schedule.mock.calls[0]?.[0]).toEqual(sub!.currentPeriodEnd);
    });
    test.each([
        ["2090-10-16T13:00:00Z", undefined, 409],
        ["2090-10-06T13:00:00Z", "2090-10-20T13:00:00Z", 400],
    ] as const)("resume rejects a missed or changed anchor at %s", async (now, resumeAt, expectedStatus) => {
        await request("/", enrollment());
        const [sub] = await db.select().from(schema.memberSubscriptions);
        await db.update(schema.memberSubscriptions).set({ status: "paused" });
        setSystemTime(new Date(now));
        expect((await request(`/${sub!.id}/resume`, { resumeAt })).status).toBe(expectedStatus);
        expect((await db.select().from(schema.memberSubscriptions))[0]?.status).toBe("paused");
        expect(schedule).not.toHaveBeenCalled();
    });

});
