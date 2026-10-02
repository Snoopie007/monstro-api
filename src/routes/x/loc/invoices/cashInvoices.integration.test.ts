import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";
import { ensureCashInvoice } from "@/subtrees/utils/server/cashInvoices";

describe.skipIf(!process.env.BILLING_TEST_DATABASE_URL)("cash invoice creation and email", () => {
    const url = process.env.BILLING_TEST_DATABASE_URL!;
    const namespace = `cash_invoice_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 2, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["member_invoices", "transactions", "member_subscriptions", "member_plan_pricing", "member_plans", "members", "locations", "location_state", "tax_rates"];
    const periodStart = new Date(Date.now() - 8 * 86400000);
    const periodEnd = new Date(Date.now() - 86400000);
    const queued = new Map<string, unknown>();
    let allowed = true;
    let failEmail = false;
    const enqueue = mock(async (_name: string, email: unknown, options: { jobId?: string }) => {
        if (failEmail) throw new Error("Email queue unavailable");
        queued.set(options.jobId!, email);
        return {};
    });
    let app: Pick<Elysia, "handle">;

    beforeAll(async () => {
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@/utils/locationAccess", () => ({ canEditLocationMember: async () => allowed }));
        mock.module("@/utils/additionalFees", () => ({ getAdditionalFeesForCheckout: async () => [] }));
        mock.module("@/libs/wallet", () => ({ Wallet: class { charge = async () => true; } }));
        mock.module("@/libs/PaymentGateway", () => ({ SquarePaymentGateway: class {}, StripePaymentGateway: class {} }));
        mock.module("@/queues", () => ({ invoiceQueue: {} }));
        mock.module("@/queues/email", () => ({ emailQueue: { add: enqueue } }));
        const { createInvoiceRoutes } = await import("./create");
        const { sendInvoiceRoutes } = await import("./send");
        const { markPaidInvoiceRoutes } = await import("./markPaid");
        const { previewInvoiceRoutes } = await import("./preview");
        const create = await createInvoiceRoutes(new Elysia());
        const send = await sendInvoiceRoutes(new Elysia());
        const paid = await markPaidInvoiceRoutes(new Elysia());
        const preview = await previewInvoiceRoutes(new Elysia());
        app = new Elysia().group("/loc/:lid/invoices", group => group.use(create).use(send).use(paid).use(preview));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        allowed = true; failEmail = false; queued.clear(); enqueue.mockClear();
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into members (id,user_id,first_name,last_name,email) values ('member','user','Jasper','Test','jasper@example.test')`;
        await sql`insert into locations (id,name,slug,vendor_id,country,timezone,email) values ('loc','Cash test','cash-test','vendor','US','America/New_York','vendor@example.test')`;
        await sql`insert into location_state (location_id,plan_id,status) values ('loc',2,'active')`;
        await sql`insert into member_plans (id,name,description,location_id,type) values ('plan','Weekly','Weekly','loc','recurring')`;
        await sql`insert into member_plan_pricing (id,member_plan_id,name,price,interval,interval_threshold) values ('price','plan','Weekly',10000,'week',1)`;
        await sql`insert into member_subscriptions (id,member_id,location_id,member_plan_pricing_id,payment_type,status,start_date,current_period_start,current_period_end,metadata) values ('sub','member','loc','price','cash','active',${periodStart.toISOString()},${periodStart.toISOString()},${periodEnd.toISOString()},'{}')`;
    });
    const request = (path: string, body = {}, location = "loc") => app.handle(new Request(`http://localhost/loc/${location}/invoices${path}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    const create = (body = {}) => request("/", { memberId: "member", subscriptionId: "sub", type: "from-subscription", paymentType: "cash", ...body });
    const created = async (response: Response) => await response.json() as { invoice: { id: string; total: number; dueDate: string } };
    const prepare = () => db.transaction(tx => ensureCashInvoice(tx, {
        subscriptionId: "sub", memberId: "member", locationId: "loc", periodStart, periodEnd,
        quote: { items: [{ name: "Weekly", quantity: 1, price: 10000 }], total: 10000, subTotal: 10000, tax: 0,
            currency: "USD", platformFeeAmount: 0, invoiceDescription: "Weekly", transactionDescription: "Weekly" },
    }));
    const count = async (table: string) => (await sql`select count(*)::int as total from ${sql(table)}`)[0]!.total;
    const unchangedPeriod = async () => expect(new Date((await sql`select current_period_end from member_subscriptions where id='sub'`)[0]!.current_period_end)).toEqual(periodEnd);

    test("concurrent UI and worker writers reuse one invoice and transaction", async () => {
        const [response, worker] = await Promise.all([create(), prepare()]);
        expect([200, 201]).toContain(response.status);
        expect((await created(response)).invoice.id).toBe(worker.invoice.id);
        expect(await count("member_invoices")).toBe(1);
        expect(await count("transactions")).toBe(1);
        await unchangedPeriod();
    });
    test("repeated creation preserves the invoice's authoritative amount", async () => {
        const first = await created(await create());
        const second = await created(await create({ discount: 9999, dueDate: "2030-01-01" }));
        expect(second.invoice.id).toBe(first.invoice.id);
        expect(second.invoice.total).toBe(first.invoice.total);
        expect(new Date(second.invoice.dueDate)).toEqual(periodEnd);
    });
    test("cash preview and creation use the same persisted subscription discount", async () => {
        await sql`update member_subscriptions set metadata='{"promo":{"discount":{"amount":2500,"duration":2}}}' where id='sub'`;
        const preview = await request("/preview", { memberId: "member", type: "from-subscription", subscriptionId: "sub", discount: 9999 });
        expect(preview.status).toBe(200);
        expect(await preview.json()).toMatchObject({ preview: { amount_due: 7500 } });
        expect((await created(await create({ discount: 9999 }))).invoice.total).toBe(7500);
    });
    test("an existing legacy unpaid invoice is reused", async () => {
        const { invoice } = await prepare();
        await sql`update member_invoices set status='unpaid',renewal_key=null where id=${invoice.id}`;
        expect((await created(await create())).invoice.id).toBe(invoice.id);
        expect(await count("member_invoices")).toBe(1);
    });
    test("an expired cash trial can create and send its invoice without advancing the cycle", async () => {
        await sql`update member_subscriptions set status='trialing',trial_end=${periodEnd.toISOString()} where id='sub'`;
        const response = await create();
        expect(response.status).toBe(201);
        const { invoice } = await created(response);
        expect((await request(`/${invoice.id}/send`)).status).toBe(200);
        expect(enqueue).toHaveBeenCalledTimes(1);
        expect((await sql`select status from member_invoices where id=${invoice.id}`)[0]!.status).toBe("sent");
        await unchangedPeriod();
    });
    test("an ongoing cash trial cannot create an invoice", async () => {
        const trialEnd = new Date(Date.now() + 86400000);
        await sql`update member_subscriptions set status='trialing',trial_end=${trialEnd.toISOString()} where id='sub'`;
        const response = await create();
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: "SUBSCRIPTION_NOT_COLLECTING" });
        expect(await count("member_invoices")).toBe(0);
        expect(enqueue).not.toHaveBeenCalled();
        await unchangedPeriod();
    });
    test("a stale selected billing period cannot create an invoice", async () => {
        const response = await create({ periodStart: periodStart.toISOString(), periodEnd: new Date(periodEnd.getTime() + 7 * 86400000).toISOString() });
        expect(response.status).toBe(409);
        expect(await count("member_invoices")).toBe(0);
    });
    test("cash creation and sending require edit-member permission", async () => {
        const { invoice } = await prepare();
        allowed = false;
        expect((await create()).status).toBe(403);
        expect((await request(`/${invoice.id}/send`)).status).toBe(403);
        expect(enqueue).not.toHaveBeenCalled();
    });
    test("simultaneous sends queue one cash email and leave billing dates alone", async () => {
        const { invoice } = await prepare();
        const responses = await Promise.all([request(`/${invoice.id}/send`), request(`/${invoice.id}/send`)]);
        expect(responses.map(response => response.status)).toEqual([200, 200]);
        expect(enqueue).toHaveBeenCalledTimes(1);
        expect(queued.get(`cashInvoiceEmail_${invoice.id}`)).toMatchObject({ template: "InvoiceReminderEmail", to: "jasper@example.test",
            metadata: { invoice: { id: invoice.id, paymentType: "cash", total: 10000 }, timezone: "America/New_York" } });
        expect((await sql`select status from member_invoices where id=${invoice.id}`)[0]!.status).toBe("sent");
        await unchangedPeriod();
    });
    test("email queue failure leaves a draft retryable", async () => {
        const { invoice } = await prepare();
        failEmail = true;
        expect((await request(`/${invoice.id}/send`)).status).toBe(503);
        expect((await sql`select status,sent_at from member_invoices where id=${invoice.id}`)[0]).toMatchObject({ status: "draft", sent_at: null });
        failEmail = false;
        expect((await request(`/${invoice.id}/send`)).status).toBe(200);
        expect(queued.size).toBe(1);
    });
    test("legacy unpaid invoices use the shared payment confirmation", async () => {
        const { invoice } = await prepare();
        await sql`update member_invoices set status='unpaid' where id=${invoice.id}`;
        expect((await request(`/${invoice.id}/mark-paid`, { paymentType: "cash" })).status).toBe(200);
        expect((await sql`select status from member_invoices where id=${invoice.id}`)[0]!.status).toBe("paid");
        expect((await sql`select count(*)::int as total from member_invoices where status='draft'`)[0]!.total).toBe(1);
    });
    test("invoice and transaction inserts roll back together", async () => {
        await sql`alter table transactions add constraint reject_cash check (payment_type <> 'cash')`;
        try {
            await expect(prepare()).rejects.toThrow();
            expect(await count("member_invoices")).toBe(0);
        } finally { await sql`alter table transactions drop constraint reject_cash`; }
    });
    test("pausing after preparation blocks both creation and sending", async () => {
        const { invoice } = await prepare();
        await sql`update member_subscriptions set status='paused' where id='sub'`;
        await expect(prepare()).rejects.toMatchObject({ code: "SUBSCRIPTION_NOT_COLLECTING" });
        expect((await request(`/${invoice.id}/send`)).status).toBe(400);
        expect(enqueue).not.toHaveBeenCalled();
        expect((await sql`select status from member_invoices where id=${invoice.id}`)[0]!.status).toBe("draft");
    });
});
