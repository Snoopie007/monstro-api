import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

const url = process.env.BILLING_TEST_DATABASE_URL;
describe.skipIf(!url)("bundles after guarded Stripe settlement", () => {
    const namespace = `stripe_bundle_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    const sql = postgres(url!, { max: 3, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["member_subscriptions", "member_invoices", "transactions", "integrations", "bundles", "bundle_components", "bundle_purchases", "member_subscription_addons", "addon_plan_price_overrides"];
    const enqueue = mock(async (..._args: unknown[]) => {});
    let handle: typeof import("./stripePlanCharge").handleStripePlanCharge;
    let activate: typeof import("@/routes/x/loc/addonsBundles/bundlePurchases").activateBundlePurchase;
    beforeAll(async () => {
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url!).hostname)) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@/queues", () => ({ enqueueSubscriptionAddonJob: enqueue }));
        ({ handleStripePlanCharge: handle } = await import("./stripePlanCharge"));
        ({ activateBundlePurchase: activate } = await import("@/routes/x/loc/addonsBundles/bundlePurchases"));
    });
    afterAll(async () => { await sql.end(); await admin`drop schema if exists ${admin(namespace)} cascade`; await admin.end(); });
    beforeEach(async () => {
        enqueue.mockReset();
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into bundles (id,location_id,name) values ('bundle','loc','Test bundle')`;
        await sql`insert into bundle_purchases (id,bundle_id,member_id) values ('purchase','bundle','member')`;
        await sql`insert into bundle_components (id,bundle_id,member_plan_pricing_id) values ('subscription-component','bundle','price')`;
        await sql`insert into bundle_components (id,bundle_id,addon_id,target_subscription_component_id) values ('addon-component','bundle','addon','subscription-component')`;
        await sql`insert into member_subscription_addons (id,member_subscription_id,addon_id,bundle_purchase_id,bundle_component_id) values ('addon-purchase','sub','addon','purchase','addon-component')`;
        await sql`insert into member_subscriptions (id,member_id,location_id,member_plan_pricing_id,payment_type,gateway_payment_id,status,start_date,current_period_start,current_period_end,bundle_purchase_id,bundle_component_id) values ('sub','member','loc','price','card','method','incomplete','2026-10-01','2026-10-01','2026-11-01','purchase','subscription-component')`;
        await db.insert(schema.integrations).values({ id: "integration", locationId: "loc", service: "stripe", accountId: "acct_test" });
        await db.insert(schema.transactions).values({ id: "txn", memberId: "member", locationId: "loc", type: "inbound", status: "pending", paymentType: "card" });
        await db.insert(schema.memberInvoices).values({ id: "invoice", memberId: "member", locationId: "loc", memberPlanId: "sub", transactionId: "txn", status: "unpaid", total: 100, subTotal: 100, tax: 0,
            metadata: { billingAttempt: { id: "attempt", status: "in_flight", paymentIntentId: "pi_test", gatewayIntegrationId: "integration", stripeAccountId: "acct_test", paymentMethodId: "method" } },
        });
    });
    const success = () => handle({ invoiceId: "invoice", memberPlanId: "sub", locationId: "loc", memberId: "member", amount: 100, currency: "USD", paymentType: "card", failedReason: null, failedCode: null, success: true, receiptUrl: null, paymentMethodId: "method", paymentIntentId: "pi_test", feeAmount: 0, stripeAccountId: "acct_test", billingAttemptId: "attempt" });
    test("an early webhook settles payment but waits for the saved method before activating add-ons", async () => {
        await sql`update member_subscriptions set gateway_payment_id=null`;
        await success();
        expect((await db.select().from(schema.memberInvoices))[0]?.paid).toBe(true);
        expect(enqueue).not.toHaveBeenCalled();
        expect(await activate("loc", "purchase")).toMatchObject({ status: "subscriptions-not-ready" });
        await sql`update member_subscriptions set gateway_payment_id='method'`;
        expect(await activate("loc", "purchase")).toMatchObject({ status: "ready", addonPurchaseIds: ["addon-purchase"] });
    });
    test("success redelivery repairs a failed enqueue without rewriting accounting", async () => {
        enqueue.mockRejectedValueOnce(new Error("Queue unavailable"));
        await expect(success()).rejects.toThrow("Queue unavailable");
        const transactions = await db.select().from(schema.transactions);
        const invoices = await db.select().from(schema.memberInvoices);
        expect(invoices[0]?.paid).toBe(true);
        await success();
        expect(enqueue).toHaveBeenCalledTimes(2);
        expect(await db.select().from(schema.transactions)).toEqual(transactions);
        expect(await db.select().from(schema.memberInvoices)).toEqual(invoices);
    });
    test("a decline replay cannot cancel a paid bundle", async () => {
        await success(); enqueue.mockClear();
        await handle({ invoiceId: "invoice", memberPlanId: "sub", locationId: "loc", memberId: "member", amount: 100, paymentType: "card", failedReason: "Declined", failedCode: "card_declined", success: false, receiptUrl: null, paymentMethodId: "method", paymentIntentId: "pi_test", feeAmount: 0, stripeAccountId: "acct_test", billingAttemptId: "attempt" });
        expect((await db.select().from(schema.bundlePurchases))[0]?.status).toBe("pending");
        expect((await db.select().from(schema.memberSubscriptionAddons))[0]?.status).toBe("pending");
        expect(enqueue).not.toHaveBeenCalled();
    });
    test.each(["paused", "canceled"] as const)("valid success preserves %s and starts no add-ons", async status => {
        await sql`update member_subscriptions set status=${status}`;
        await success();
        expect((await db.select().from(schema.memberSubscriptions))[0]?.status).toBe(status);
        expect(enqueue).not.toHaveBeenCalled();
    });
});
