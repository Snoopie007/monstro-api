import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    test,
} from "bun:test";
import { Elysia } from "elysia";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

describe.skipIf(!process.env.BILLING_TEST_DATABASE_URL)(
    "recording a cash invoice payment",
    () => {
        const url = process.env.BILLING_TEST_DATABASE_URL!;
        const namespace = `cash_paid_test_${crypto.randomUUID().replaceAll("-", "")}`;
        const admin = postgres(url, { max: 1, onnotice: () => {} });
        const sql = postgres(url, {
            max: 2,
            prepare: false,
            connection: { search_path: `${namespace},public,extensions` },
            onnotice: () => {},
        });
        const db = drizzle(sql, { schema });
        const tables = [
            "member_invoices",
            "transactions",
            "member_subscriptions",
            "member_plan_pricing",
            "member_plans",
            "locations",
            "location_state",
            "tax_rates",
        ];
        let app: Pick<Elysia, "handle">;
        let allowed = true;
        let walletSuccess = true;
        const walletCharge = mock(async () => walletSuccess);

        beforeAll(async () => {
            if (
                !["localhost", "127.0.0.1", "[::1]"].includes(
                    new URL(url).hostname,
                )
            )
                throw new Error("Local Postgres required");
            await admin`create schema ${admin(namespace)}`;
            for (const table of tables)
                await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
            mock.module("@/db/db", () => ({ db }));
            mock.module("@/utils/locationAccess", () => ({
                canEditLocationMember: async () => allowed,
            }));
            mock.module("@/utils/additionalFees", () => ({
                getAdditionalFeesForCheckout: async () => [],
            }));
            mock.module("@/libs/wallet", () => ({
                Wallet: class {
                    charge = walletCharge;
                },
            }));
            mock.module("@/queues", () => ({ invoiceQueue: {} }));
            const { markPaidInvoiceRoutes } = await import("./markPaid");
            const routes = await markPaidInvoiceRoutes(new Elysia());
            app = new Elysia()
                .onError(({ error }) => {
                    console.error(error);
                })
                .group("/loc/:lid/invoices", (group) => group.use(routes));
        });
        afterAll(async () => {
            await sql.end();
            await admin`drop schema if exists ${admin(namespace)} cascade`;
            await admin.end();
        });
        beforeEach(async () => {
            allowed = true;
            walletSuccess = true;
            walletCharge.mockClear();
            for (const table of tables)
                await sql`truncate ${sql(namespace)}.${sql(table)}`;
            await sql`insert into locations (id,name,slug,vendor_id,country,timezone) values ('loc','Cash test','cash-test','vendor','US','America/New_York')`;
            await sql`insert into location_state (location_id,plan_id,status) values ('loc',2,'active')`;
            await sql`insert into member_plans (id,name,description,location_id,type) values ('plan','Weekly','Weekly','loc','recurring')`;
            await sql`insert into member_plan_pricing (id,member_plan_id,name,price,interval,interval_threshold) values ('price','plan','Weekly',10000,'week',1)`;
            await sql`insert into member_subscriptions (id,member_id,location_id,member_plan_pricing_id,payment_type,status,start_date,current_period_start,current_period_end,metadata) values ('sub','member','loc','price','cash','active','2026-09-26T12:00:00Z','2026-09-26T12:00:00Z','2026-10-03T12:00:00Z','{}')`;
            await sql`insert into member_invoices (id,member_id,location_id,member_plan_id,payment_type,status,total,subtotal,tax,currency,due_date,for_period_start,for_period_end,metadata) values ('invoice','member','loc','sub','cash','sent',10000,10000,0,'USD','2026-10-03T12:00:00Z','2026-09-26T12:00:00Z','2026-10-03T12:00:00Z','{"platformFeeAmount":0}')`;
        });

        const pay = (location = "loc", body: Record<string, unknown> = {}) =>
            app.handle(
                new Request(
                    `http://localhost/loc/${location}/invoices/invoice/mark-paid`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ paymentType: "cash", ...body }),
                    },
                ),
            );

        test("concurrent confirmations record one transaction without advancing the cycle", async () => {
            const responses = await Promise.all([pay(), pay()]);
            expect(responses.map((response) => response.status)).toEqual([
                200, 200,
            ]);
            expect(
                (
                    await sql`select status,paid from member_invoices where id='invoice'`
                )[0],
            ).toMatchObject({ status: "paid", paid: true });
            expect(
                (
                    await sql`select count(*)::int as total from transactions where status='paid'`
                )[0]?.total,
            ).toBe(1);
            expect(
                new Date(
                    (
                        await sql`select current_period_end from member_subscriptions where id='sub'`
                    )[0]!.current_period_end,
                ),
            ).toEqual(new Date("2026-10-03T12:00:00Z"));
            expect(
                (
                    await sql`select count(*)::int as total from member_invoices where status='draft'`
                )[0]?.total,
            ).toBe(0);
            expect((await pay()).status).toBe(200);
            expect(
                (
                    await sql`select count(*)::int as total from transactions where status='paid'`
                )[0]?.total,
            ).toBe(1);
        });

        test.each(["paused", "canceled"])(
            "records payment without reactivating a %s subscription",
            async (status) => {
                await sql`update member_subscriptions set status=${status} where id='sub'`;
                expect((await pay()).status).toBe(200);
                const current = (
                    await sql`select status,current_period_end from member_subscriptions where id='sub'`
                )[0]!;
                expect(current.status).toBe(status);
                expect(new Date(current.current_period_end)).toEqual(
                    new Date("2026-10-03T12:00:00Z"),
                );
                expect(
                    (
                        await sql`select count(*)::int as total from member_invoices where status='draft'`
                    )[0]?.total,
                ).toBe(0);
            },
        );

        test("paying an older invoice does not advance a newer subscription period", async () => {
            await sql`update member_subscriptions set current_period_start='2026-10-03T12:00:00Z',current_period_end='2026-10-10T12:00:00Z' where id='sub'`;
            expect((await pay()).status).toBe(200);
            expect(
                new Date(
                    (
                        await sql`select current_period_end from member_subscriptions where id='sub'`
                    )[0]!.current_period_end,
                ),
            ).toEqual(new Date("2026-10-10T12:00:00Z"));
        });

        test("reuses a sent invoice for the next period", async () => {
            await sql`insert into member_invoices (id,member_id,location_id,member_plan_id,payment_type,status,total,subtotal,tax,due_date,for_period_start,for_period_end) values ('next','member','loc','sub','cash','sent',10000,10000,0,'2026-10-10T12:00:00Z','2026-10-03T12:00:00Z','2026-10-10T12:00:00Z')`;
            expect((await pay()).status).toBe(200);
            expect(
                (
                    await sql`select count(*)::int as total from member_invoices`
                )[0]?.total,
            ).toBe(2);
            expect(
                (
                    await sql`select status from member_invoices where id='next'`
                )[0]?.status,
            ).toBe("sent");
        });

        test("paying one invoice preserves overdue debt from another period", async () => {
            await sql`insert into member_invoices (id,member_id,location_id,member_plan_id,payment_type,status,total,subtotal,tax,due_date,for_period_start,for_period_end) values ('older-draft','member','loc','sub','cash','draft',10000,10000,0,'2026-09-19T12:00:00Z','2026-09-12T12:00:00Z','2026-09-19T12:00:00Z')`;
            expect((await pay()).status).toBe(200);
            expect(
                (
                    await sql`select count(*)::int as total from member_invoices where for_period_start='2026-10-03T12:00:00Z'`
                )[0]?.total,
            ).toBe(0);
            expect((await sql`select status from member_subscriptions`)[0]!.status).toBe("past_due");
        });

        test("wallet failure leaves the invoice, transaction, and subscription unchanged", async () => {
            walletSuccess = false;
            await sql`update member_invoices set metadata='{"platformFeeAmount":200}' where id='invoice'`;
            const response = await pay();
            expect(response.status).toBe(402);
            expect(await response.json()).toMatchObject({
                code: "WALLET_CHARGE_FAILED",
            });
            expect(
                (
                    await sql`select status,paid from member_invoices where id='invoice'`
                )[0],
            ).toMatchObject({ status: "sent", paid: false });
            expect(
                (await sql`select count(*)::int as total from transactions`)[0]
                    ?.total,
            ).toBe(0);
        });

        test("rejects access, location, draft, automatic invoice, and stale amount", async () => {
            allowed = false;
            expect((await pay()).status).toBe(403);
            allowed = true;
            expect((await pay("another-location")).status).toBe(404);
            expect((await pay("loc", { expectedTotal: 5000 })).status).toBe(
                409,
            );
            await sql`update member_invoices set status='draft' where id='invoice'`;
            expect((await pay()).status).toBe(400);
            await sql`update member_invoices set status='sent',payment_type='card' where id='invoice'`;
            expect((await pay()).status).toBe(400);
            expect(
                (await sql`select count(*)::int as total from transactions`)[0]
                    ?.total,
            ).toBe(0);
        });

        test("validates payment dates in the location timezone", async () => {
            expect((await pay("loc", { paidDate: "2026-02-30" })).status).toBe(
                400,
            );
            expect((await pay("loc", { paidDate: "2100-01-01" })).status).toBe(
                400,
            );
            expect((await pay("loc", { paidDate: "2026-01-01" })).status).toBe(
                200,
            );
            expect(
                new Date(
                    (
                        await sql`select charge_date from transactions where status='paid'`
                    )[0]!.charge_date,
                ),
            ).toEqual(new Date("2026-01-01T17:00:00Z"));
        });
    },
);
