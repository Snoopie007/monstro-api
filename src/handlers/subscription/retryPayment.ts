import { db } from "@/db/db";
import { getCheckoutContext } from "@/utils/getCheckoutContext";
import { chargeWithGateway } from "@/utils/checkoutUtil";
import type { TransactionActivity } from "@subtrees/types";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

export type RetryPaymentErrorCode =
    | "SUBSCRIPTION_NOT_FOUND"
    | "SUBSCRIPTION_CANCELED"
    | "NO_PAYMENT_METHOD"
    | "INVOICE_NOT_FOUND"
    | "TRANSACTION_NOT_FOUND"
    | "LOCATION_INACTIVE"
    | "CHARGE_FAILED";

export type RetryPaymentResult =
    | { ok: true; subscriptionId: string; invoiceId: string; transactionId: string }
    | { ok: false; code: RetryPaymentErrorCode; message: string };

function fail(code: RetryPaymentErrorCode, message: string): RetryPaymentResult {
    return { ok: false, code, message };
}

export async function retrySubscriptionPayment(props: {
    lid: string;
    memberPlanId: string;
}): Promise<RetryPaymentResult> {
    const { lid, memberPlanId } = props;

    const sub = await db.query.memberSubscriptions.findFirst({
        where: (s, { and, eq: eqCol }) => and(
            eqCol(s.locationId, lid),
            eqCol(s.id, memberPlanId),
        ),
    });
    if (!sub) return fail("SUBSCRIPTION_NOT_FOUND", "Subscription not found");
    if (sub.cancelAt && sub.cancelAt.getTime() <= Date.now()) {
        return fail("SUBSCRIPTION_CANCELED", "This subscription is canceled and cannot be retried.");
    }
    if (!sub.gatewayPaymentId) {
        return fail("NO_PAYMENT_METHOD", "Subscription has no gateway payment method");
    }

    const invoice = await db.query.memberInvoices.findFirst({
        where: (i, { and, eq: eqCol }) => and(
            eqCol(i.memberPlanId, sub.id),
            eqCol(i.forPeriodStart, sub.currentPeriodStart),
            eqCol(i.status, "unpaid"),
        ),
        with: { transaction: true },
    });
    if (!invoice) return fail("INVOICE_NOT_FOUND", "Failed invoice not found");

    const transaction = invoice.transaction;
    if (!transaction) return fail("TRANSACTION_NOT_FOUND", "Transaction not found");

    const { gateway, gatewayCustomerId, locationState } = await getCheckoutContext({
        lid,
        mid: sub.memberId,
    });
    if (locationState.status !== "active") {
        return fail("LOCATION_INACTIVE", "Location is not active");
    }

    const charge = await chargeWithGateway({
        gateway,
        gatewayCustomerId,
        paymentMethodId: sub.gatewayPaymentId,
        transactionId: transaction.id,
        paymentType: transaction.paymentType,
        total: invoice.total,
        feesAmount: transaction.feeAmount,
        currency: locationState.currency,
        description: `Retry payment for ${invoice.id}`,
        note: `transId:${transaction.id}|mid:${sub.memberId}|lid:${lid}|priceId:${sub.id}`,
        metadata: { locationId: lid, memberId: sub.memberId },
    });

    const now = new Date();
    const activity: TransactionActivity = charge.status === "approved"
        ? {
            at: now.toISOString(),
            reason: `Payment ${charge.status}`,
            paymentType: transaction.paymentType,
            brand: charge.brand,
            last4: charge.last4,
        }
        : {
            at: now.toISOString(),
            reason: charge.status === "failed"
                ? `Payment failed: ${charge.failureReason}`
                : "Unknown payment result",
            paymentType: transaction.paymentType,
            brand: charge.brand,
            last4: charge.last4,
        };

    await db.transaction(async (tx) => {
        await tx.update(transactions).set({
            activities: [...(transaction.activities ?? []), activity],
        }).where(eq(transactions.id, transaction.id));
        if (charge.status === "approved") {
            await tx.update(memberInvoices).set({
                status: "paid",
            }).where(eq(memberInvoices.id, invoice.id));
            await tx.update(memberSubscriptions).set({
                status: "active",
            }).where(eq(memberSubscriptions.id, sub.id));
        }
    });

    if (charge.status !== "approved") {
        const message = charge.status === "failed"
            ? charge.failureReason
            : "Payment retry did not complete";
        return fail("CHARGE_FAILED", message);
    }

    return {
        ok: true,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
        transactionId: transaction.id,
    };
}
