import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
} from "bun:test";
import postgres from "postgres";
import type { InvoiceItem } from "@/subtrees/types";

// Run this file in its own Bun process. It uses the application's real DB client.
describe.skipIf(!process.env.BILLING_TEST_DATABASE_URL)(
    "subscription quote billing history",
    () => {
        const url = process.env.BILLING_TEST_DATABASE_URL!;
        const namespace = `quote_history_${crypto.randomUUID().replaceAll("-", "")}`;
        const tables = [
            "member_invoices",
            "member_subscriptions",
            "member_plan_pricing",
            "member_plans",
            "additional_fees",
            "bundle_purchases",
            "bundle_components",
            "member_subscription_addons",
            "addons",
            "addon_plan_price_overrides",
        ];
        const start = new Date("2026-10-01T00:00:00Z");
        const end = new Date("2026-11-01T00:00:00Z");
        let admin: ReturnType<typeof postgres>;
        let database: typeof import("@/db/db");
        let build: (typeof import("./subscriptionQuote"))["buildSubscriptionInvoiceQuote"];
        const savedUrl = process.env.DATABASE_URL;
        const savedAdminUrl = process.env.DATABASE_ADMIN_URL;
        const service = {
            name: "Monthly",
            quantity: 1,
            price: 8000,
            sourceType: "subscription",
            sourceId: "sub",
            pricingSource: { type: "base" },
            basePlanPricingId: "price",
            effectivePlanPricingId: "price",
            billing: {
                subTotal: 8000,
                tax: 0,
                total: 8000,
                forPeriodStart: start.toISOString(),
                forPeriodEnd: end.toISOString(),
                commissionBasis: { type: "unavailable" },
            },
        } satisfies InvoiceItem;
        const fee = {
            ...service,
            feeId: "old-fee",
            price: 500,
            billing: {
                ...service.billing,
                subTotal: 500,
                total: 500,
                commissionBasis: undefined,
            },
        };
        const props = {
            memberId: "payer",
            subscriptionId: "sub",
            locationId: "location",
            pricing: {
                id: "price",
                name: "Monthly",
                price: 10000,
                interval: "month",
                intervalThreshold: 1,
                plan: { name: "Plan", locationId: "location" },
            },
            location: {
                country: "US",
                taxRates: [],
                locationState: { planId: 2 },
            },
            subscriptionMetadata: {
                promo: { discount: { amount: 2000, duration: 1 } },
            },
        } satisfies Parameters<typeof build>[0];

        beforeAll(async () => {
            if (
                !["localhost", "127.0.0.1", "[::1]"].includes(
                    new URL(url).hostname,
                ) ||
                new URL(url).search
            )
                throw new Error("Local disposable Postgres required");
            admin = postgres(url, { max: 1, onnotice: () => {} });
            await admin`create schema ${admin(namespace)}`;
            for (const table of tables)
                await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
            const scoped = new URL(url);
            scoped.searchParams.set(
                "options",
                `-csearch_path=${namespace},public,extensions`,
            );
            process.env.DATABASE_URL = scoped.toString();
            process.env.DATABASE_ADMIN_URL = scoped.toString();
            database = await import("@/db/db");
            ({ buildSubscriptionInvoiceQuote: build } = await import(
                "./subscriptionQuote"
            ));
        });
        afterAll(async () => {
            if (database)
                await Promise.all([
                    database.db.$client.end(),
                    database.admindb.$client.end(),
                ]);
            if (admin) {
                await admin`drop schema if exists ${admin(namespace)} cascade`;
                await admin.end();
            }
            if (savedUrl === undefined) delete process.env.DATABASE_URL;
            else process.env.DATABASE_URL = savedUrl;
            if (savedAdminUrl === undefined)
                delete process.env.DATABASE_ADMIN_URL;
            else process.env.DATABASE_ADMIN_URL = savedAdminUrl;
        });
        beforeEach(async () => {
            const sql = database.db.$client;
            for (const table of tables)
                await sql`truncate ${sql(namespace)}.${sql(table)}`;
            await sql`insert into member_plans (id,name,description,location_id,type) values ('plan','Plan','Test','location','recurring')`;
            await sql`insert into member_plan_pricing (id,member_plan_id,name,price,interval,interval_threshold) values ('price','plan','Monthly',10000,'month',1)`;
            await sql`insert into member_subscriptions (id,member_id,location_id,member_plan_pricing_id,payment_type,status,start_date,current_period_start,current_period_end) values ('sub','payer','location','price','cash','active',${start.toISOString()},${start.toISOString()},${end.toISOString()})`;
            await sql`insert into additional_fees (id,location_id,label,type,amount,checkout_types,initial_charge_only) values ('setup','location','Setup','fixed',1000,array['subscription'],true), ('recurring','location','Recurring','fixed',500,array['subscription'],false)`;
        });
        async function paidInvoice(
            memberId = "payer",
            locationId = "location",
            items: InvoiceItem[] = [
                service,
                fee,
                { ...fee, feeId: "old-fee-2" },
            ],
        ) {
            const sql = database.db.$client;
            await sql`insert into member_invoices (id,member_id,location_id,items,paid,status,total,subtotal,tax) values (${crypto.randomUUID()},${memberId},${locationId},array(select value from jsonb_array_elements(${JSON.stringify(items)}::jsonb)),true,'paid',14000,14000,0)`;
        }

        test("the real quote expires a promotion and initial-only fee after one combined payment", async () => {
            const initial = await build(props);
            expect(initial.discount).toBe(2000);
            expect(
                initial.items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(true);
            await paidInvoice();
            const renewal = await build(props);
            expect(renewal.discount).toBe(0);
            expect(renewal.total).toBe(10500);
            expect(
                renewal.items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(false);
            expect(
                renewal.items.every(
                    (item) =>
                        item.sourceType === "subscription" &&
                        item.sourceId === "sub",
                ),
            ).toBe(true);
        });
        test("multiple component fee lines consume only one promotion cycle", async () => {
            await paidInvoice();
            const quote = await build({
                ...props,
                subscriptionMetadata: {
                    promo: { discount: { amount: 2000, duration: 2 } },
                },
            });
            expect(quote.discount).toBe(2000);
        });
        test("unrelated members, locations and merchandise do not expire the promotion", async () => {
            await paidInvoice("other");
            await paidInvoice("payer", "other");
            await paidInvoice("payer", "location", [
                { name: "Merchandise", quantity: 1, price: 14000 },
            ]);
            expect((await build(props)).discount).toBe(2000);
        });
        test("imported renewal guard and explicit phase override keep their precedence", async () => {
            const imported = {
                ...props,
                subscriptionMetadata: {
                    ...props.subscriptionMetadata,
                    additionalFeesStartAtRenewal: true,
                },
            };
            expect(
                (await build(imported)).items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(false);
            expect(
                (
                    await build({ ...imported, billingPhase: "initial" })
                ).items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(true);
            expect(
                (await build({ ...props, billingPhase: "renewal" })).items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(false);
        });
        test("direct historical paid cash invoices still count without a paid transaction or complete periods", async () => {
            const sql = database.db.$client;
            await sql`insert into member_invoices (id,member_id,location_id,member_plan_id,paid,status,total,subtotal,tax) values ('legacy','payer','location','sub',true,'unpaid',10000,10000,0)`;
            const quote = await build(props);
            expect(quote.discount).toBe(0);
            expect(
                quote.items.some(
                    (item) => "feeId" in item && item.feeId === "setup",
                ),
            ).toBe(false);
        });
    },
);
