import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import postgres from "postgres";
import type { ChargeWithGatewayInput, ChargeWithGatewayResult, chargeWithGateway } from "@/utils/checkoutUtil";

type Charge = typeof chargeWithGateway;

const databaseUrl = process.env.BILLING_TEST_DATABASE_URL ?? "";
const redisUrl = process.env.BILLING_TEST_REDIS_URL ?? "";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// Run this file in its own Bun process. It uses the application's real DB
// client and queues, pointed at a disposable local Postgres and Redis.
describe.skipIf(!databaseUrl || !redisUrl)("bundle checkout", () => {
    const namespace = `bundle_checkout_${crypto.randomUUID().replaceAll("-", "")}`;
    const tables = [
        "locations", "location_state", "tax_rates", "integrations", "members", "member_locations",
        "member_plans", "member_plan_pricing", "additional_fees", "promos",
        "addons", "addon_plan_price_overrides", "bundles", "bundle_components", "bundle_purchases",
        "member_subscriptions", "member_subscription_addons", "member_invoices", "transactions",
        "workflows", "workflow_triggers", "workflow_queues",
    ];
    const testEnv = {
        UPSTASH_REDIS_TLS: "false",
        SUPABASE_JWT_SECRET: "bundle-checkout-test",
        SENDGRID_API_KEY: "bundle-checkout-test",
        NOVU_API_KEY: "bundle-checkout-test",
    };
    const savedEnv = { ...process.env };
    let admin: ReturnType<typeof postgres>;
    let app: Awaited<ReturnType<typeof loadApp>>;

    async function loadApp() {
        const [database, schema, purchases, payment, stripe, square, invoices, subscriptionQueue, addonQueue, cancellation, refundCharges, addonInvoices, settlement] = await Promise.all([
            import("@/db/db"),
            import("@/subtrees/schemas"),
            import("./prepare"),
            import("./pay"),
            import("@/routes/webhooks/handlers/stripe/stripeBundleCharge"),
            import("@/routes/webhooks/handlers/square/squareBundlePayment"),
            import("@/subtrees/utils/server/subscriptionInvoices"),
            import("@/queues/subscriptions"),
            import("@/queues/subscriptionAddons"),
            import("../cancellation"),
            import("../refund/charges"),
            import("@/subtrees/utils/server/addonInvoices"),
            import("./settlement"),
        ]);

        return {
            ...database,
            schema,
            sql: database.db.$client,
            prepareBundle: purchases.prepareBundle,
            payBundle: payment.payBundle,
            recordStripeOutcome: stripe.recordStripeOutcome,
            handleSquareBundleSuccess: square.handleSquareBundleSuccess,
            readSubscriptionInvoice: invoices.readSubscriptionInvoice,
            subQueue: subscriptionQueue.subQueue,
            subscriptionAddonQueue: addonQueue.subscriptionAddonQueue,
            cancelBundle: cancellation.cancelBundle,
            cancelForRefund: cancellation.cancelForRefund,
            getRefundCharges: refundCharges.getRefundCharges,
            findBundleChargeOwner: refundCharges.findBundleChargeOwner,
            settleAddonInvoice: addonInvoices.settleAddonInvoice,
            isCollectorInvoice: settlement.isCollectorInvoice,
            collectBundlePayment: settlement.collectBundlePayment,
        };
    }

    beforeAll(async () => {
        const database = new URL(databaseUrl);
        const redis = new URL(redisUrl);

        if (!LOCAL_HOSTS.includes(database.hostname) || database.search || !LOCAL_HOSTS.includes(redis.hostname)) {
            throw new Error("Local disposable Postgres and Redis required");
        }

        admin = postgres(databaseUrl, { max: 1, onnotice: () => {} });
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) {
            await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        }

        database.searchParams.set("options", `-csearch_path=${namespace},public,extensions`);
        Object.assign(process.env, testEnv, {
            DATABASE_URL: database.toString(),
            DATABASE_ADMIN_URL: database.toString(),
            UPSTASH_REDIS_HOST: redis.hostname,
            UPSTASH_REDIS_PORT: redis.port || "6379",
            UPSTASH_REDIS_PASSWORD: decodeURIComponent(redis.password),
        });
        app = await loadApp();
    });

    afterAll(async () => {
        if (app) {
            await app.subQueue.obliterate({ force: true });
            await app.subscriptionAddonQueue.obliterate({ force: true });
            await Promise.all([app.subQueue.close(), app.subscriptionAddonQueue.close()]);
            await Promise.all([app.db.$client.end(), app.admindb.$client.end()]);
        }

        if (admin) {
            await admin`drop schema if exists ${admin(namespace)} cascade`;
            await admin.end();
        }

        process.env = savedEnv;
    });

    async function seed(gateway: "stripe" | "square") {
        const { sql } = app;
        const customerId = gateway === "stripe" ? "cus_test" : "square_customer";

        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into locations (id, name, vendor_id, slug, country) values ('loc', 'Dojo', 'vendor', 'dojo', 'US')`;
        await sql`insert into location_state (location_id, plan_id, payment_gateway_id) values ('loc', 2, 'gateway')`;
        await sql`insert into integrations (id, location_id, service, account_id, access_token, metadata)
            values ('gateway', 'loc', ${gateway}, 'acct_test', 'token', ${JSON.stringify({ squareLocationId: "square_location" })}::jsonb)`;
        await sql`insert into members (id, user_id, email, first_name) values ('member', 'user', 'member@example.invalid', 'Ada')`;
        await sql`insert into member_locations (member_id, location_id, gateway_customer_id) values ('member', 'loc', ${customerId})`;
        await sql`insert into member_plans (id, name, description, location_id, type, total_class_limit, class_limit_interval)
            values ('plan-a', 'Unlimited', '', 'loc', 'recurring', 8, 'month'), ('plan-b', 'Open mat', '', 'loc', 'recurring', null, null)`;
        await sql`insert into member_plan_pricing (id, member_plan_id, name, price, interval, interval_threshold, session_commission_value_minor)
            values ('price-a', 'plan-a', 'Monthly', 10000, 'month', 1, null), ('price-b', 'plan-b', 'Monthly', 5000, 'month', 1, 500)`;
        await sql`insert into addons (id, location_id, name, amount, currency, billing_type, interval, interval_threshold)
            values ('addon', 'loc', 'Gear', 2500, 'USD', 'recurring', 'month', 1)`;
        await sql`insert into bundles (id, location_id, name) values ('bundle', 'loc', 'Family')`;
        await sql`insert into bundle_components (id, bundle_id, member_plan_pricing_id, price_override, sort_order)
            values ('component-a', 'bundle', 'price-a', 8000, 0), ('component-b', 'bundle', 'price-b', 4000, 1)`;
        await sql`insert into bundle_components (id, bundle_id, addon_id, target_subscription_component_id, price_override, sort_order)
            values ('component-addon', 'bundle', 'addon', 'component-a', 2000, 2)`;
    }

    beforeEach(() => seed("stripe"));

    async function prepare(paymentType: "card" | "us_bank_account" | "cash" = "card") {
        const result = await app.prepareBundle({
            locationId: "loc",
            memberId: "member",
            bundleId: "bundle",
            paymentType,
            paymentMethodId: paymentType === "cash" ? undefined : "pm_test",
            selectedOptionalComponentIds: [],
        });

        if (result.status !== "created") throw new Error(result.error);

        return result.value;
    }

    async function pay(purchaseId: string, charge: Charge) {
        const result = await app.payBundle({ locationId: "loc", bundleId: "bundle", purchaseId }, charge);

        if (result.status !== "ok") throw new Error(`Bundle purchase is ${result.status}`);

        return result.value;
    }

    function fakeCharge(answer: (input: ChargeWithGatewayInput) => Promise<ChargeWithGatewayResult>) {
        const calls: ChargeWithGatewayInput[] = [];
        const charge: Charge = async (input) => {
            calls.push(input);
            return answer(input);
        };

        return { charge, calls };
    }

    const approve = (paymentIntentId = "pi_approved") => fakeCharge(async () => ({
        status: "approved", paymentIntentId, gatewayMetadata: {},
    }));
    const decline = () => fakeCharge(async () => {
        throw {
            type: "StripeCardError",
            code: "card_declined",
            message: "Your card was declined.",
            payment_intent: { id: "pi_declined", status: "requires_payment_method" },
        };
    });
    const processing = () => fakeCharge(async () => ({
        status: "uncertain", paymentIntentId: "pi_processing", paymentIntentStatus: "processing",
        message: "Stripe payment intent is processing", gatewayMetadata: {},
    }));

    async function state() {
        const { db, schema } = app;
        const [invoices, transactions, subscriptions, addonPurchases, purchases] = await Promise.all([
            db.select().from(schema.memberInvoices),
            db.select().from(schema.transactions),
            db.select().from(schema.memberSubscriptions),
            db.select().from(schema.memberSubscriptionAddons),
            db.select().from(schema.bundlePurchases),
        ]);

        return { invoices, transactions, subscriptions, addonPurchases, purchases };
    }

    function stripeWebhook(input: { attemptId: string; paymentIntentId: string; amount?: number }) {
        return app.recordStripeOutcome({
            invoiceId: invoiceIdOf(input.attemptId),
            billingAttemptId: input.attemptId,
            success: true,
            amount: input.amount ?? 14000,
            currency: "usd",
            paymentIntentId: input.paymentIntentId,
            stripeAccountId: "acct_test",
            receiptUrl: null,
            failedReason: null,
            failedCode: null,
        });
    }

    // Attempt ids are billing-<invoice id>-<attempt number>.
    const invoiceIdOf = (attemptId: string) => attemptId.replace(/^billing-/, "").replace(/-\d+$/, "");

    function attemptIdOf(calls: ChargeWithGatewayInput[]) {
        const [call] = calls;

        if (!call) throw new Error("The gateway was never charged");

        return call.transactionId;
    }

    function expectNothingActive(current: Awaited<ReturnType<typeof state>>) {
        expect(current.subscriptions.map((subscription) => subscription.status)).toEqual(["incomplete", "incomplete"]);
        expect(current.addonPurchases.map((addon) => addon.status)).toEqual(["pending"]);
        expect(current.purchases.map((purchase) => purchase.status)).toEqual(["pending"]);
    }

    function expectEverythingActive(current: Awaited<ReturnType<typeof state>>) {
        expect(current.subscriptions.map((subscription) => subscription.status)).toEqual(["active", "active"]);
        expect(current.addonPurchases.map((addon) => addon.status)).toEqual(["active"]);
        expect(current.purchases.map((purchase) => purchase.status)).toEqual(["active"]);
    }

    test.each(["stripe", "square"] as const)("%s: one charge settles one invoice and activates every component", async (gateway) => {
        await seed(gateway);
        const prepared = await prepare();
        const { charge, calls } = approve();

        const result = await pay(prepared.purchase.id, charge);
        const current = await state();
        const [invoice] = current.invoices;

        expect(result.payment).toBe("active");
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({
            total: 14000,
            transactionId: `billing-${invoice?.id}-0`,
            attempt: { id: `billing-${invoice?.id}-0`, invoiceId: invoice?.id },
            referenceId: invoice?.id,
            metadata: { locationId: "loc", memberId: "member", invoiceId: invoice?.id, billingAttemptId: `billing-${invoice?.id}-0` },
        });
        expect(current.invoices).toHaveLength(1);
        expect(current.transactions).toHaveLength(1);
        expect(invoice).toMatchObject({ paid: true, status: "paid", memberPlanId: null, total: 14000 });
        expect(current.transactions[0]).toMatchObject({ status: "paid", total: 14000, paymentIntentId: "pi_approved" });
        expect(current.purchases[0]?.invoiceId).toBe(invoice?.id ?? "missing invoice");
        expectEverythingActive(current);

        const billedBySubscription = Object.fromEntries(current.subscriptions.map((subscription) => [
            subscription.memberPlanPricingId,
            invoice && app.readSubscriptionInvoice(invoice, subscription.id)?.periods,
        ]));
        expect(billedBySubscription).toMatchObject({
            "price-a": [{ total: 8000, commissionBasis: { type: "allowance", visitAllowance: 8 } }],
            "price-b": [{ total: 4000, commissionBasis: { type: "fixed", sessionValueMinor: 500 } }],
        });

        const [addon] = current.addonPurchases;
        expect(addon?.paidPeriodStartsAt?.toISOString()).toBe(prepared.purchase.startsAt);
        expect(addon?.nextBillAt).toEqual(addon?.paidPeriodEndsAt ?? null);
        expect(await app.subscriptionAddonQueue.getJob(`subscription-addon-renew:${addon?.id}:${addon?.nextBillAt?.getTime()}`)).toBeTruthy();

        for (const subscription of current.subscriptions) {
            expect(await app.subQueue.getJobScheduler(`renewal:static:${subscription.id}`)).toBeTruthy();
        }
    });

    test("a decline activates nothing, and paying again starts attempt 2 on the same invoice", async () => {
        const prepared = await prepare();
        const declined = decline();

        expect((await pay(prepared.purchase.id, declined.charge)).payment).toBe("declined");

        const afterDecline = await state();
        const [invoice] = afterDecline.invoices;
        expectNothingActive(afterDecline);
        expect(invoice).toMatchObject({ paid: false, status: "unpaid" });
        expect(invoice?.metadata?.billingAttempt).toMatchObject({ status: "failed", paymentIntentId: "pi_declined" });
        expect(afterDecline.transactions[0]).toMatchObject({ status: "failed", failedCode: "card_declined" });

        const retry = approve();
        expect((await pay(prepared.purchase.id, retry.charge)).payment).toBe("active");
        expect(retry.calls[0]?.transactionId).toBe(`billing-${invoice?.id}-1`);

        const afterRetry = await state();
        expect(afterRetry.invoices).toHaveLength(1);
        expect(afterRetry.transactions).toHaveLength(1);
        expect(afterRetry.transactions[0]).toMatchObject({ status: "paid", paymentIntentId: "pi_approved" });
        expectEverythingActive(afterRetry);
    });

    test("an uncertain charge is never repeated, and its webhook settles it once", async () => {
        const prepared = await prepare();
        const uncertain = processing();

        expect((await pay(prepared.purchase.id, uncertain.charge)).payment).toBe("processing");

        const again = approve();
        expect((await pay(prepared.purchase.id, again.charge)).payment).toBe("processing");
        expect(again.calls).toHaveLength(0);
        expectNothingActive(await state());

        const attemptId = attemptIdOf(uncertain.calls);
        await stripeWebhook({ attemptId, paymentIntentId: "pi_processing" });
        const settled = await state();
        await stripeWebhook({ attemptId, paymentIntentId: "pi_processing" });

        expectEverythingActive(settled);
        expect(await state()).toEqual(settled);
    });

    test("a webhook that arrives before the pay response settles the invoice once", async () => {
        const prepared = await prepare();
        const racing = fakeCharge(async (input) => {
            await stripeWebhook({ attemptId: input.transactionId, paymentIntentId: "pi_approved" });
            return { status: "approved", paymentIntentId: "pi_approved", gatewayMetadata: {} };
        });

        expect((await pay(prepared.purchase.id, racing.charge)).payment).toBe("active");

        const current = await state();
        expect(racing.calls).toHaveLength(1);
        expect(current.transactions).toHaveLength(1);
        expect(current.transactions[0]).toMatchObject({ status: "paid", paymentIntentId: "pi_approved" });
        expectEverythingActive(current);
    });

    test.each(["stripe", "square"] as const)("%s: a webhook repairs a database failure after the charge, without charging again", async (gateway) => {
        await seed(gateway);
        const prepared = await prepare();
        const { sql } = app;
        await sql`create or replace function fail_paid() returns trigger language plpgsql as $$
            begin raise exception 'database unavailable'; end $$`;
        await sql`create or replace trigger fail_paid before update on transactions for each row
            when (new.status = 'paid') execute function fail_paid()`;
        const first = approve(gateway === "stripe" ? "pi_approved" : "square_payment");

        await expect(pay(prepared.purchase.id, first.charge)).rejects.toMatchObject({ cause: { message: "database unavailable" } });
        await sql`drop trigger fail_paid on transactions`;

        const again = approve();
        expect((await pay(prepared.purchase.id, again.charge)).payment).toBe("processing");
        expect(again.calls).toHaveLength(0);
        expectNothingActive(await state());

        const attemptId = attemptIdOf(first.calls);

        if (gateway === "stripe") {
            await stripeWebhook({ attemptId, paymentIntentId: "pi_approved" });
        } else {
            await app.handleSquareBundleSuccess({
                invoiceId: invoiceIdOf(attemptId),
                billingAttemptId: attemptId,
                squarePaymentId: "square_payment",
                locationId: "square_location",
                customerId: "square_customer",
                amount: 14000,
                currency: "USD",
                receiptUrl: null,
            });
        }

        const current = await state();
        expect(first.calls).toHaveLength(1);
        expect(current.transactions).toHaveLength(1);
        expect(current.invoices[0]).toMatchObject({ paid: true, status: "paid" });
        expectEverythingActive(current);
    });

    test("a payment for less than the invoice cannot settle it", async () => {
        const prepared = await prepare();
        const uncertain = processing();
        await pay(prepared.purchase.id, uncertain.charge);
        const attemptId = attemptIdOf(uncertain.calls);

        await expect(stripeWebhook({ attemptId, paymentIntentId: "pi_processing", amount: 8000 }))
            .rejects.toThrow(`Payment amount or currency does not match invoice ${invoiceIdOf(attemptId)}`);

        const current = await state();
        expect(current.invoices[0]).toMatchObject({ paid: false });
        expectNothingActive(current);
    });

    test("pay reports an unusable gateway before claiming an attempt", async () => {
        const prepared = await prepare();
        const before = await state();
        const { charge, calls } = approve();
        await app.sql`update member_locations set gateway_customer_id = null`;

        expect(await app.payBundle({ locationId: "loc", bundleId: "bundle", purchaseId: prepared.purchase.id }, charge))
            .toEqual({ status: "payment-unavailable", error: "Gateway customer not found" });
        expect(calls).toHaveLength(0);
        expect(await state()).toEqual(before);
    });

    test("square: pay reports a missing Square location before claiming an attempt", async () => {
        await seed("square");
        const prepared = await prepare();
        await app.sql`update integrations set metadata = '{}'::jsonb`;
        const before = await state();
        const { charge, calls } = approve();

        expect(await app.payBundle({ locationId: "loc", bundleId: "bundle", purchaseId: prepared.purchase.id }, charge))
            .toEqual({ status: "payment-unavailable", error: "This location's Square gateway has no Square location configured" });
        expect(calls).toHaveLength(0);

        const current = await state();
        expect(current.invoices).toHaveLength(1);
        expect(current.invoices[0]?.metadata).not.toHaveProperty("billingAttempt");
        expect(current).toEqual(before);
    });

    test("a cancellation that commits while pay waits to claim reports an inactive purchase", async () => {
        const prepared = await prepare();
        const { charge, calls } = approve();
        let paying: ReturnType<typeof app.payBundle> | undefined;

        // Pay reads the purchase as pending, then waits on this row lock to claim the attempt.
        await admin.begin(async (tx) => {
            await tx`update ${tx(namespace)}.bundle_purchases
                set status = 'canceled', ended_at = greatest(now(), starts_at), updated_at = now()
                where id = ${prepared.purchase.id}`;
            paying = app.payBundle({ locationId: "loc", bundleId: "bundle", purchaseId: prepared.purchase.id }, charge);

            for (let tries = 0; ; tries++) {
                const waiting = await tx`select 1 from pg_locks where not granted`;

                if (waiting.length > 0) return;

                if (tries === 200) throw new Error("Pay never waited for the purchase lock");

                await Bun.sleep(10);
            }
        });

        expect(await paying).toEqual({ status: "inactive" });
        expect(calls).toHaveLength(0);

        const current = await state();
        expect(current.purchases[0]?.status).toBe("canceled");
        expect(current.invoices[0]?.metadata).not.toHaveProperty("billingAttempt");
    });

    test("prepare rejects components v1 cannot charge in one payment", async () => {
        const { sql } = app;
        const future = new Date(Date.now() + 86_400_000).toISOString();

        expect(await app.prepareBundle({
            locationId: "loc", memberId: "member", bundleId: "bundle", paymentType: "card", paymentMethodId: "pm_test",
            startDate: future, selectedOptionalComponentIds: [],
        })).toMatchObject({ status: "invalid-components", error: "Future bundle start dates are not supported yet" });

        await sql`update addons set currency = 'CAD'`;
        expect(await app.prepareBundle({
            locationId: "loc", memberId: "member", bundleId: "bundle", paymentType: "card", paymentMethodId: "pm_test",
            selectedOptionalComponentIds: [],
        })).toMatchObject({ status: "invalid-components", error: "Every bundled add-on must be priced in USD" });

        const current = await state();
        expect(current.purchases).toEqual([]);
        expect(current.invoices).toEqual([]);
        expect(current.transactions).toEqual([]);
    });

    test("a cash bundle activates every subscription in one transaction, one cash invoice each", async () => {
        const prepared = await prepare("cash");
        const { sql } = app;
        // Fails the second subscription's cash invoice, after the first one was written.
        await sql`create or replace function fail_second_invoice() returns trigger language plpgsql as $$
            begin
                if exists (select 1 from member_invoices where member_id = new.member_id) then
                    raise exception 'cash invoice failed';
                end if;
                return new;
            end $$`;
        await sql`create or replace trigger fail_second_invoice before insert on member_invoices for each row
            execute function fail_second_invoice()`;
        const unused = approve();

        await expect(pay(prepared.purchase.id, unused.charge)).rejects.toMatchObject({ cause: { message: "cash invoice failed" } });

        const failed = await state();
        expectNothingActive(failed);
        expect(failed.invoices).toEqual([]);

        await sql`drop trigger fail_second_invoice on member_invoices`;
        expect((await pay(prepared.purchase.id, unused.charge)).payment).toBe("active");

        const current = await state();
        expect(unused.calls).toHaveLength(0);
        expect(current.purchases[0]?.invoiceId).toBeNull();
        expect(current.subscriptions.map((subscription) => subscription.status)).toEqual(["active", "active"]);
        expect(current.invoices.map((invoice) => invoice.memberPlanId).sort()).toEqual([...prepared.subscriptionIds].sort());
        expect(current.invoices.map((invoice) => invoice.paymentType)).toEqual(["cash", "cash"]);
        // Today's cash flow: add-ons bill through their worker, and the bundle waits for its required add-on.
        expect(current.purchases[0]?.status).toBe("pending");
        expect(await app.subscriptionAddonQueue.getJob(`subscription-addon:activate:${prepared.addonPurchaseIds[0]}`)).toBeTruthy();
    });

    test("the gateway's reported method is recorded, not the one the draft asked for", async () => {
        const prepared = await prepare("us_bank_account");
        const card = fakeCharge(async () => ({ status: "approved", paymentIntentId: "pi_card", gatewayMetadata: {}, paymentType: "card" }));

        expect((await pay(prepared.purchase.id, card.charge)).payment).toBe("active");

        const current = await state();
        expect(current.transactions[0]?.paymentType).toBe("card");
        expect(current.invoices[0]?.paymentType).toBe("card");
    });

    test("a full-price renewal after a plain cancel is refunded the normal way, not with the bundle", async () => {
        const prepared = await prepare();
        await pay(prepared.purchase.id, approve().charge);
        expect((await app.cancelBundle("loc", prepared.purchase.id)).status).toBe("canceled");

        // The subscriptions keep running at full price; one renews a day after the cancel.
        const { db, schema } = app;
        const [transaction] = await db.select().from(schema.transactions);
        const [invoice] = await db.select().from(schema.memberInvoices);
        if (!transaction || !invoice) throw new Error("The bundle charge was not saved");
        const later = new Date(Date.now() + 86_400_000);
        await db.insert(schema.transactions).values({ ...transaction, id: "txn_renewal", paymentIntentId: "pi_renewal", total: 10000, chargeDate: later, created: later });
        await db.insert(schema.memberInvoices).values({
            ...invoice, id: "inv_renewal", transactionId: "txn_renewal", memberPlanId: prepared.subscriptionIds[0],
            total: 10000, items: [], metadata: {}, renewalKey: null, created: later,
        });

        // The normal refund takes the renewal; the bundle charge still belongs to the bundle.
        expect(await app.findBundleChargeOwner("loc", "txn_renewal")).toBeNull();
        expect(await app.findBundleChargeOwner("loc", transaction.id)).toMatchObject({ id: prepared.purchase.id });

        const canceled = await app.cancelForRefund({ locationId: "loc", bundleId: "bundle", purchaseId: prepared.purchase.id });
        if (!canceled) throw new Error("The bundle was not found");
        const charges = await app.getRefundCharges("loc", canceled);

        expect(charges.map((charge) => charge.invoice.id)).toEqual([invoice.id]);
    });

    test("replaying a paid period never reopens a past-due add-on", async () => {
        const prepared = await prepare();
        await pay(prepared.purchase.id, approve().charge);
        const { db, schema, sql } = app;
        const [invoice] = await db.select().from(schema.memberInvoices);
        const [addon] = await db.select().from(schema.memberSubscriptionAddons);
        if (!invoice || !addon) throw new Error("The bundle was not activated");

        // The next period was declined, so the add-on is past due; then the first period's payment replays.
        await sql`update member_subscription_addons set status = 'past_due', next_bill_at = null`;
        const replay = { ...invoice, memberSubscriptionAddonId: addon.id, forPeriodStart: addon.paidPeriodStartsAt, forPeriodEnd: addon.paidPeriodEndsAt };
        const settled = await db.transaction((tx) => app.settleAddonInvoice(tx, replay, { status: "succeeded" }));

        const [after] = await db.select().from(schema.memberSubscriptionAddons);
        expect(after).toMatchObject({ status: "past_due", nextBillAt: null });
        expect(settled?.runAt).toBeNull();
    });

    test("a standalone add-on's pending charge is settled by its Stripe webhook", async () => {
        const { db, schema, sql } = app;
        const periodStart = new Date();
        const periodEnd = new Date(periodStart.getTime() + 30 * 86_400_000);
        await sql`insert into member_subscriptions (id, member_id, location_id, member_plan_pricing_id, payment_type, status, gateway_payment_id, start_date, current_period_start, current_period_end, metadata)
            values ('sub-solo', 'member', 'loc', 'price-a', 'card', 'active', 'pm_test', ${periodStart.toISOString()}, ${periodStart.toISOString()}, ${periodEnd.toISOString()}, '{}')`;
        await sql`insert into member_subscription_addons (id, member_subscription_id, addon_id, status, starts_at)
            values ('msa-solo', 'sub-solo', 'addon', 'pending', ${periodStart.toISOString()})`;

        // The pending transaction and invoice the worker writes before it charges.
        await db.insert(schema.transactions).values({
            id: "txn-solo", total: 2500, subTotal: 2500, tax: 0, memberId: "member", locationId: "loc", description: "Gear add-on",
            type: "inbound", status: "pending", paymentType: "card", paymentMethodId: "pm_test", currency: "USD", feeAmount: 0, items: [],
            metadata: { chargeBinding: { gatewayIntegrationId: "gateway", gatewayCustomerId: "cus_test", stripeAccountId: "acct_test" } },
        });
        await db.insert(schema.memberInvoices).values({
            id: "inv-solo", total: 2500, subTotal: 2500, tax: 0, memberId: "member", locationId: "loc", memberSubscriptionAddonId: "msa-solo",
            description: "Gear add-on", items: [], transactionId: "txn-solo", paymentType: "card", currency: "USD", invoiceType: "recurring",
            forPeriodStart: periodStart, forPeriodEnd: periodEnd, dueDate: periodStart, status: "unpaid", paid: false,
            metadata: { gatewayService: "stripe", gatewayIntegrationId: "gateway", gatewayCustomerId: "cus_test" },
        });

        // An ACH debit: accepted, not paid yet. The add-on waits for the webhook.
        const gateway = { service: "stripe" as const, integrationId: "gateway", customerId: "cus_test", stripeAccountId: "acct_test" };
        const collected = await app.collectBundlePayment({ invoiceId: "inv-solo", gateway }, async () => ({ status: "processing", paymentIntentId: "pi_solo" }));
        expect(collected).toBe("processing");
        expect((await state()).addonPurchases).toMatchObject([{ id: "msa-solo", status: "pending" }]);

        // The webhook routes the invoice to the collector, which settles the period.
        expect(await app.isCollectorInvoice("inv-solo")).toBe(true);
        await app.recordStripeOutcome({
            invoiceId: "inv-solo", billingAttemptId: "billing-inv-solo-0", success: true, amount: 2500, currency: "usd",
            paymentIntentId: "pi_solo", stripeAccountId: "acct_test", customerId: "cus_test", paymentMethodId: "pm_test",
            receiptUrl: null, failedReason: null, failedCode: null,
        });

        const current = await state();
        expect(current.invoices).toMatchObject([{ id: "inv-solo", paid: true, status: "paid" }]);
        expect(current.addonPurchases).toMatchObject([{ id: "msa-solo", status: "active", paidPeriodStartsAt: periodStart, nextBillAt: periodEnd }]);
        const jobs = await app.subscriptionAddonQueue.getJobs(["delayed", "waiting"]);
        expect(jobs.some((job) => job.name === "renew" && job.data.memberSubscriptionAddonId === "msa-solo")).toBe(true);
    });
});
