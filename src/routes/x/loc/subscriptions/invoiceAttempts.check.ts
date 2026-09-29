import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql as query } from "drizzle-orm";
import { memberInvoices } from "@subtrees/schemas/invoice";

const databaseUrl = process.env.BILLING_TEST_DATABASE_URL;
assert(databaseUrl, "Set BILLING_TEST_DATABASE_URL to a disposable local database");
const url = new URL(databaseUrl);
assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.search,
    "This check only accepts a local database URL without connection overrides");
const suffix = randomUUID().replaceAll("-", "");
const applicationName = `billing_check_${suffix}`;
url.searchParams.set("application_name", applicationName);
process.env.DATABASE_URL = url.toString();
process.env.DATABASE_ADMIN_URL = url.toString();
// Test loading boundary: database clients must not initialize before the local-only guard.
const { db, admindb } = await import("@/db/db");
const { claimInvoiceAttempt, saveInvoiceAttemptResult } = await import("./invoiceAttempts");
const sql = db.$client;
const observer = admindb.$client;
const userId = `usr_check_${suffix}`;
const vendorId = `vdr_check_${suffix}`;
const locationId = `loc_check_${suffix}`;
const memberId = `mbr_check_${suffix}`;
const invoiceId = `inv_check_${suffix}`;
const context = {
    invoiceId, gatewayIntegrationId: "int_check", gatewayCustomerId: "cus_check",
    paymentMethodId: "pm_check", paymentType: "link" as const, stripeAccountId: "acct_check",
};
const attempt = { ...context, id: `billing-${invoiceId}-1`, status: "failed", startedAt: new Date().toISOString() };
async function waitForClaimLock() {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
        const waiting = await observer`SELECT 1 FROM pg_stat_activity WHERE application_name=${applicationName} AND wait_event_type='Lock'`;
        if (waiting.length) return;
        await Bun.sleep(5);
    }
    throw new Error("The competing invoice operation did not reach the row lock");
}
try {
    await sql`INSERT INTO users(id,name,email,username,discriminator) VALUES (${userId},'Billing Check',${`${suffix}@example.test`},${suffix},1)`;
    await sql`INSERT INTO vendors(id,user_id,first_name,email) VALUES (${vendorId},${userId},'Check',${`${suffix}@example.test`})`;
    await sql`INSERT INTO locations(id,name,vendor_id,slug) VALUES (${locationId},${`Billing Check ${suffix}`},${vendorId},${suffix})`;
    await sql`INSERT INTO members(id,user_id,email) VALUES (${memberId},${userId},${`${suffix}@example.test`})`;
    await sql`INSERT INTO member_invoices(id,location_id,member_id,status,paid,attempt_count,tax,total,subtotal,payment_type,metadata) VALUES (${invoiceId},${locationId},${memberId},'unpaid',false,1,0,12500,12500,'link',${JSON.stringify({ billingAttempt: attempt })}::jsonb)`;

    const claim = Promise.withResolvers<Awaited<ReturnType<typeof claimInvoiceAttempt>>>();
    await db.transaction(async (tx) => {
        await tx.execute(query`SELECT id FROM ${memberInvoices} WHERE id=${invoiceId} FOR UPDATE`);
        claimInvoiceAttempt(context).then(claim.resolve, claim.reject);
        await waitForClaimLock();
        await tx.update(memberInvoices).set({ paid: true, status: "paid", metadata: { billingAttempt: { ...attempt, status: "succeeded" } } }).where(eq(memberInvoices.id, invoiceId));
    });
    const claimed = await claim.promise;
    assert.equal(claimed.ok, false, "A payment committed by another process must prevent a new claim");

    await sql`UPDATE member_invoices SET paid=false,status='unpaid',metadata=${JSON.stringify({ billingAttempt: { ...attempt, status: "in_flight" } })}::jsonb WHERE id=${invoiceId}`;
    const result = Promise.withResolvers<void>();
    const newerId = `billing-${invoiceId}-2`;
    await db.transaction(async (tx) => {
        await tx.execute(query`SELECT id FROM ${memberInvoices} WHERE id=${invoiceId} FOR UPDATE`);
        saveInvoiceAttemptResult({ invoiceId, attemptId: attempt.id, status: "failed" }).then(result.resolve, result.reject);
        await waitForClaimLock();
        await tx.update(memberInvoices).set({ paid: true, status: "paid", metadata: { billingAttempt: { ...attempt, id: newerId, status: "succeeded" } } }).where(eq(memberInvoices.id, invoiceId));
    });
    await result.promise;
    await saveInvoiceAttemptResult({ invoiceId, attemptId: newerId, status: "failed" });
    const [saved] = await sql`SELECT metadata FROM member_invoices WHERE id=${invoiceId}`;
    assert.equal(saved?.metadata.billingAttempt.id, newerId);
    assert.equal(saved?.metadata.billingAttempt.status, "succeeded", "Late failure cannot downgrade a paid attempt");

    await sql`UPDATE member_invoices SET paid=false,status='unpaid',metadata=${JSON.stringify({ billingAttempt: { ...attempt, status: "unknown" } })}::jsonb WHERE id=${invoiceId}`;
    assert.equal((await claimInvoiceAttempt(context)).ok, false, "Unknown outcomes cannot be replaced");
    console.log("API attempt check passed: concurrent payment/claim, stale result, terminal paid state and unknown hold.");
} finally {
    try {
        await sql`DELETE FROM member_invoices WHERE id=${invoiceId}`;
        await sql`DELETE FROM members WHERE id=${memberId}`;
        await sql`DELETE FROM locations WHERE id=${locationId}`;
        await sql`DELETE FROM vendors WHERE id=${vendorId}`;
        await sql`DELETE FROM users WHERE id=${userId}`;
    } finally {
        await sql.end();
        await observer.end();
    }
}
