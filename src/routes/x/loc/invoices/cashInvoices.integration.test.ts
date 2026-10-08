import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";
import { resolveCashBilling } from "@/subtrees/utils/cashBilling";
import { ensureCashInvoice } from "@/subtrees/utils/server/cashInvoices";

describe.skipIf(!process.env.BILLING_TEST_DATABASE_URL)("cash invoice creation and email", () => {
    const url = process.env.BILLING_TEST_DATABASE_URL!;
    const namespace = `cash_invoice_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 2, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["member_invoices", "transactions", "member_subscriptions", "member_plan_pricing", "member_plans", "members", "locations", "location_state", "tax_rates", "bundles", "bundle_components", "bundle_purchases", "member_subscription_addons", "addons", "addon_plan_price_overrides"];
    const periodStart = new Date(Date.now() - 8 * 86400000);
    const periodEnd = new Date(Date.now() - 86400000);
    const nextEnd = new Date(periodEnd.getTime() + 7 * 86400000);
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
        mock.module("@/queues", () => ({ invoiceQueue: {}, enqueueSubscriptionAddonJob: async () => {} }));
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
    const create = (body = {}) => request("/", { periodStart: periodEnd.toISOString(), periodEnd: nextEnd.toISOString(), memberId: "member", subscriptionId: "sub", type: "from-subscription", paymentType: "cash", ...body });
    const created = async (response: Response) => await response.json() as { invoice: { id: string; total: number; dueDate: string } };
    const prepare = () => db.transaction(tx => ensureCashInvoice(tx, {
        subscriptionId: "sub", memberId: "member", locationId: "loc", periodStart: periodEnd, periodEnd: nextEnd,
        quote: { items: [{ name: "Weekly", quantity: 1, price: 10000 }], total: 10000, subTotal: 10000, tax: 0,
            currency: "USD", platformFeeAmount: 0, invoiceDescription: "Weekly", transactionDescription: "Weekly" },
    }));
    const count = async (table: string) => (await sql`select count(*)::int as total from ${sql(table)}`)[0]!.total;
    const advancedPeriod = async () => expect(new Date((await sql`select current_period_end from member_subscriptions where id='sub'`)[0]!.current_period_end)).toEqual(nextEnd);

    test("cash preview and invoice use the bundle price within main's cycle", async () => {
        await sql`insert into bundles (id,location_id,name) values ('bundle','loc','Discount bundle')`;
        await sql`insert into bundle_purchases (id,bundle_id,member_id,status) values ('purchase','bundle','member','active')`;
        await sql`insert into bundle_components (id,bundle_id,member_plan_pricing_id,price_override) values ('component','bundle','price',7000)`;
        await sql`update member_subscriptions set bundle_purchase_id='purchase',bundle_component_id='component'`;
        const preview = await request("/preview", { memberId: "member", type: "from-subscription", subscriptionId: "sub" });
        expect(preview.status).toBe(200);
        expect(await preview.json()).toMatchObject({ preview: { amount_due: 7000 } });
        const { invoice } = await created(await create());
        expect(invoice.total).toBe(7000);
        const row = await db.query.memberInvoices.findFirst();
        expect(row?.items?.[0]).toMatchObject({ price: 7000, pricingSource: { type: "bundle", bundlePurchaseId: "purchase" }, basePlanPricingId: "price" });
        await advancedPeriod();
    });
    test("a prepaid add-on discount must cover the whole invoice period", async () => {
        await sql`insert into member_plan_pricing (id,member_plan_id,name,price,interval,interval_threshold) values ('member-price','plan','Member price',6000,'week',1)`;
        await sql`insert into addons (id,location_id,name,amount,billing_type) values ('addon','loc','Prepaid membership',1000,'one_time')`;
        await sql`insert into addon_plan_price_overrides (id,addon_id,source_plan_pricing_id,replacement_plan_pricing_id) values ('override','addon','price','member-price')`;
        await sql`insert into member_subscription_addons (id,member_subscription_id,addon_id,status,starts_at,paid_period_starts_at,paid_period_ends_at) values ('addon-purchase','sub','addon','active',${periodStart.toISOString()},${periodStart.toISOString()},${new Date(nextEnd.getTime()-1).toISOString()})`;
        const preview = () => request("/preview", { memberId: "member", type: "from-subscription", subscriptionId: "sub" });
        expect(await (await preview()).json()).toMatchObject({ preview: { amount_due: 10000 } });
        await sql`update member_subscription_addons set paid_period_ends_at=${nextEnd.toISOString()}`;
        expect(await (await preview()).json()).toMatchObject({ preview: { amount_due: 6000 } });
        expect((await created(await create())).invoice.total).toBe(6000);
    });

    test("concurrent UI and worker writers reuse one invoice and transaction", async () => {
        const [response, worker] = await Promise.all([create(), prepare()]);
        expect([200, 201]).toContain(response.status);
        expect((await created(response)).invoice.id).toBe(worker.invoice.id);
        expect(await count("member_invoices")).toBe(1);
        expect(await count("transactions")).toBe(1);
        await advancedPeriod();
        const subscription = await db.query.memberSubscriptions.findFirst({ with: { pricing: true } });
        const invoices = await db.query.memberInvoices.findMany();
        const billing = resolveCashBilling(subscription!, invoices, "America/New_York");
        expect(billing?.action).toBe("send");
        expect(billing?.invoice?.id).toBe(worker.invoice.id);
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
    test("an expired cash trial can create and send its invoice and start its first paid period", async () => {
        await sql`update member_subscriptions set status='trialing',trial_end=${periodEnd.toISOString()} where id='sub'`;
        const response = await create();
        expect(response.status).toBe(201);
        const { invoice } = await created(response);
        expect((await request(`/${invoice.id}/send`)).status).toBe(200);
        expect(enqueue).toHaveBeenCalledTimes(1);
        expect((await sql`select status from member_invoices where id=${invoice.id}`)[0]!.status).toBe("sent");
        await advancedPeriod();
    });
    test("an ongoing cash trial cannot create an invoice", async () => {
        const trialEnd = new Date(Date.now() + 86400000);
        await sql`update member_subscriptions set status='trialing',trial_end=${trialEnd.toISOString()} where id='sub'`;
        const response = await create();
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ code: "SUBSCRIPTION_NOT_COLLECTING" });
        expect(await count("member_invoices")).toBe(0);
        expect(enqueue).not.toHaveBeenCalled();
        expect(new Date((await sql`select current_period_end from member_subscriptions`)[0]!.current_period_end)).toEqual(periodEnd);
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
        await advancedPeriod();
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
        expect((await sql`select count(*)::int as total from member_invoices where status='draft'`)[0]!.total).toBe(0);
    });
    test("free plans can manually start a period and send its invoice", async () => {
        await sql`update location_state set plan_id=1`;
        const response = await create();
        expect(response.status).toBe(201);
        const { invoice } = await created(response);
        expect((await request(`/${invoice.id}/send`)).status).toBe(200);
        expect(enqueue).toHaveBeenCalledTimes(1);
        await advancedPeriod();
    });
    test("renewal retains older unpaid debt and creates one invoice for the next period", async () => {
        await sql`insert into member_invoices (id,member_id,location_id,member_plan_id,payment_type,status,total,subtotal,tax,due_date,for_period_start,for_period_end) values ('old','member','loc','sub','cash','unpaid',10000,10000,0,${periodStart.toISOString()},${periodStart.toISOString()},${periodEnd.toISOString()})`;
        const first = await created(await create());
        expect(first.invoice.id).not.toBe("old");
        expect((await created(await create())).invoice.id).toBe(first.invoice.id);
        expect(await count("member_invoices")).toBe(2);
        await advancedPeriod();
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
    test("deferred access cannot be invoiced early or charged as a billing period", async () => {
        const future = new Date(Date.now() + 86400000);
        const metadata = { deferredBilling: { version: 1, firstPaymentAt: future.toISOString(), accessStartDate: "2026-01-01", timezone: "UTC", prorate: true, prorationAmount: 4000 } };
        await sql`update member_subscriptions set current_period_end=${future.toISOString()}, metadata=${JSON.stringify(metadata)}::jsonb where id='sub'`;
        const response = await create({ periodStart: periodStart.toISOString(), periodEnd: future.toISOString() });
        expect(response.status).toBe(409);
        expect(await count("member_invoices")).toBe(0);
    });
    test("deferred first invoice includes proration exactly once", async () => {
        const metadata = { deferredBilling: { version: 1, firstPaymentAt: periodEnd.toISOString(), accessStartDate: "2026-01-01", timezone: "UTC", prorate: true, prorationAmount: 4000 } };
        await sql`update member_subscriptions set metadata=${JSON.stringify(metadata)}::jsonb where id='sub'`;
        const responses = await Promise.all([create(), create()]);
        expect(responses.every(r => [200, 201].includes(r.status))).toBe(true);
        const invoice = (await created(responses[0]!)).invoice;
        expect(invoice.total).toBe(14000);
        expect(await count("member_invoices")).toBe(1);
        const { quoteSubscriptionInvoice } = await import("./subscriptionQuote");
        const quote = quoteSubscriptionInvoice({ locationId: "loc", subscriptionId: "sub", subscriptionMetadata: metadata,
            pricing: { id: "price", name: "Weekly", price: 10000, interval: "week", intervalThreshold: 1, plan: { locationId: "loc" } },
            location: { country: "US", taxRates: [], locationState: { planId: 2 } }, billingPhase: "renewal", additionalFees: [], periodStart: nextEnd });
        expect(quote.total).toBe(10000);
    });

});
