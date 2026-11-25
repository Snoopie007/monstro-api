import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

// Real database checks: a plan's first paid charge also makes the member active.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("Stripe plan charge member status", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `stripe_member_status_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const sql = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    const tables = ["transactions", "member_invoices", "members", "integrations", "member_packages", "member_subscriptions", "member_locations", "workflows", "workflow_triggers", "workflow_queues"];
    let handle: typeof import("./stripePlanCharge").handleStripePlanCharge;

    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        await sql`alter table member_invoices add column if not exists renewal_key text`;
        mock.module("@/db/db", () => ({ db }));
        ({ handleStripePlanCharge: handle } = await import("./stripePlanCharge"));
    });
    afterAll(async () => {
        await sql.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into members (id,user_id,first_name,email) values ('member','user','QA','qa@example.invalid')`;
        await db.insert(schema.integrations).values({ id: "integration", locationId: "location", service: "stripe", accountId: "acct_qa" });
    });

    async function seed(planId: string, planStatus: string, memberStatus: string) {
        await db.insert(schema.memberLocations).values({ memberId: "member", locationId: "location", status: memberStatus } as never);
        if (planId.startsWith("pkg_")) {
            await db.insert(schema.memberPackages).values({ id: planId, memberId: "member", locationId: "location", status: planStatus, startDate: new Date() } as never);
        } else {
            await db.insert(schema.memberSubscriptions).values({ id: planId, memberId: "member", locationId: "location", status: planStatus, startDate: new Date() } as never);
        }
        await db.insert(schema.memberInvoices).values({ id: "invoice", memberId: "member", locationId: "location", memberPlanId: planId, status: "sent", tax: 0, total: 100, subTotal: 100,
            metadata: { billingAttempt: { id: "attempt", status: "in_flight", paymentIntentId: "intent", gatewayIntegrationId: "integration", stripeAccountId: "acct_qa", paymentMethodId: "method" } },
        } as never);
    }
    const charge = (planId: string, success = true) => handle({
        invoiceId: "invoice", memberPlanId: planId, locationId: "location", memberId: "member", amount: 100, currency: "USD", paymentType: "card",
        failedReason: success ? null : "Decline", failedCode: success ? null : "card_declined", success, receiptUrl: null, paymentMethodId: "method",
        paymentIntentId: "intent", feeAmount: 0, stripeAccountId: "acct_qa", billingAttemptId: "attempt",
    });
    const memberStatus = async () => (await db.select().from(schema.memberLocations))[0]?.status;

    test("the first paid charge activates the subscription and the member", async () => {
        await seed("sub_qa", "incomplete", "incomplete");
        await charge("sub_qa");
        expect((await db.select().from(schema.memberSubscriptions))[0]?.status).toBe("active");
        expect(await memberStatus()).toBe("active");
    });

    test("the first paid package charge activates the member", async () => {
        await seed("pkg_qa", "incomplete", "incomplete");
        await charge("pkg_qa");
        expect(await memberStatus()).toBe("active");
    });

    test("a renewal leaves the member's status alone", async () => {
        await seed("sub_qa", "active", "incomplete");
        await charge("sub_qa");
        expect(await memberStatus()).toBe("incomplete");
    });

    test("a declined first charge leaves the member's status alone", async () => {
        await seed("sub_qa", "incomplete", "incomplete");
        await charge("sub_qa", false);
        expect(await memberStatus()).toBe("incomplete");
    });

    test("an archived member stays archived", async () => {
        await seed("sub_qa", "incomplete", "archived");
        await charge("sub_qa");
        expect(await memberStatus()).toBe("archived");
    });
});
