import { Elysia } from "elysia";
import { WebhooksHelper } from "square";
import { db } from "@/db/db";
import {
    memberInvoices,
    memberPackages,
    memberSubscriptions,
    memberLocations,
    transactions,
} from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { and, eq } from "drizzle-orm";
import type { Square } from "square";



function getPaymentFromEvent(event: unknown): Square.Payment | null {
    if (!event || typeof event !== "object") return null;
    const e = event as Record<string, unknown>;
    const data = e.data as Record<string, unknown> | undefined;
    if (!data) return null;
    const obj = data.object as Record<string, unknown> | undefined;
    if (!obj) return null;
    const payment = obj.payment as Square.Payment | undefined;
    return payment ?? null;
}




export function squareWebhookRoutes(app: Elysia) {
    app.post("/square", async ({ request, headers, status }) => {
        const signature = headers["x-square-hmacsha256-signature"];
        if (typeof signature !== "string") {
            return status(400, { error: "[SQUARE WEBHOOK] Missing signature header" });
        }

        const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
        const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
        if (!signatureKey || !notificationUrl) {
            console.error(
                "[SQUARE WEBHOOK] Missing SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_NOTIFICATION_URL"
            );
            return status(500, { error: "[SQUARE WEBHOOK] Server not configured" });
        }

        const rawText = await request.text();
        let valid: boolean;
        try {
            valid = await WebhooksHelper.verifySignature({
                requestBody: rawText,
                signatureHeader: signature,
                signatureKey,
                notificationUrl,
            });
        } catch (err) {
            console.error("[SQUARE WEBHOOK] Signature verification error:", err);
            return status(500, { error: "[SQUARE WEBHOOK] Signature verification failed" });
        }

        if (!valid) {
            console.warn("[SQUARE WEBHOOK] Invalid signature");
            return status(403, { error: "[SQUARE WEBHOOK] Invalid signature" });
        }

        let event: unknown;
        try {
            event = JSON.parse(rawText);
        } catch {
            return status(400, { error: "[SQUARE WEBHOOK] Invalid JSON body" });
        }

        processSquareEvent(event).catch((err) => {
            console.error("[SQUARE WEBHOOK] Failed to process event:", err);
        });

        return status(200, { message: "[SQUARE WEBHOOK] Event accepted" });
    }, {
        parse: "none",
    });

    return app;
}

async function processSquareEvent(event: unknown): Promise<void> {
    if (!event || typeof event !== "object") return;
    const type = (event as { type?: string }).type;
    if (type !== "payment.updated") return;

    const payment = getPaymentFromEvent(event);
    if (!payment) {
        console.warn("[SQUARE WEBHOOK] payment.updated without payment object");
        return;
    }

    const ref = payment.referenceId;
    if (!ref) {
        console.warn("[SQUARE WEBHOOK] payment has no reference_id; skipping");
        return;
    }

    const statusUpper = (payment.status || "").toUpperCase();
    const isCompleted = statusUpper === "COMPLETED";
    const isFailed = statusUpper === "FAILED" || statusUpper === "CANCELED";
    if (!isCompleted && !isFailed) return;

    const invoiceRow = await db.query.memberInvoices.findFirst({
        where: (inv, { eq: e }) => e(inv.id, ref),
    });
    if (!invoiceRow) {
        console.warn("[SQUARE WEBHOOK] Invoice not found for reference_id:", ref);
        return;
    }

    const { memberPlanId, memberId, locationId, id: invoiceId } = invoiceRow;
    if (!memberPlanId || !memberId || !locationId) {
        console.warn("[SQUARE WEBHOOK] Invoice missing relation ids:", invoiceId);
        return;
    }

    const now = new Date();
    const amount = Number(payment.amountMoney?.amount) || 0;
    const feesAmount = Number(payment.appFeeMoney?.amount) || 0;

    const paymentMethodId = payment.cardDetails?.card?.id || payment.id || null;

    if (isCompleted) {
        await handleSquarePaymentCompleted({
            invoiceId,
            memberPlanId,
            memberId,
            locationId,
            payment,
            amount,
            feesAmount,
            paymentType: 'card',
            paymentMethodId,
            now,
        });
    } else {
        await handleSquarePaymentFailed({
            invoiceId,
            memberPlanId,
            memberId,
            locationId,
            payment,
            amount,
            feesAmount,
            paymentType: 'card',
            paymentMethodId,
            now,
            statusUpper,
        });
    }
}

async function handleSquarePaymentCompleted(ctx: {
    invoiceId: string;
    memberPlanId: string;
    memberId: string;
    locationId: string;
    payment: Square.Payment;
    amount: number;
    feesAmount: number;
    paymentType: PaymentType;
    paymentMethodId: string | null;
    now: Date;
}) {
    const {
        invoiceId,
        memberPlanId,
        memberId,
        locationId,
        payment,
        amount,
        feesAmount,
        paymentType,
        paymentMethodId,
        now,
    } = ctx;

    const [invoice] = await db
        .update(memberInvoices)
        .set({
            status: "paid",
            paid: true,
            stripeReceiptUrl: payment.receiptUrl ?? undefined,
            updated: now,
        })
        .where(eq(memberInvoices.id, invoiceId))
        .returning({
            description: memberInvoices.description,
            currency: memberInvoices.currency,
            total: memberInvoices.total,
            subTotal: memberInvoices.subTotal,
            tax: memberInvoices.tax,
            items: memberInvoices.items,
        });

    if (!invoice) throw new Error("Invoice not found for Square payment");

    const txValues = {
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status: "paid" as const,
        failedReason: null as string | null,
        failedCode: null as string | null,
        locationId,
        memberId,
        invoiceId,
        paymentMethodId,
        paymentType,
        chargeDate: now,
        feesAmount,
        metadata: { memberPlanId },
        updated: now,
    };

    const existingTransaction = await db.query.transactions.findFirst({
        where: (transaction, { eq: e }) => e(transaction.invoiceId, invoiceId),
    });

    if (existingTransaction) {
        await db.update(transactions).set(txValues).where(eq(transactions.id, existingTransaction.id));
    } else {
        await db.insert(transactions).values(txValues);
    }

    const isPackage = memberPlanId.startsWith("pkg_");
    await db.transaction(async (tx) => {
        if (isPackage) {
            await tx
                .update(memberPackages)
                .set({ status: "active" })
                .where(eq(memberPackages.id, memberPlanId));
        } else {
            await tx
                .update(memberSubscriptions)
                .set({
                    stripePaymentId: paymentMethodId,
                    status: "active",
                })
                .where(eq(memberSubscriptions.id, memberPlanId));
        }
        await tx
            .update(memberLocations)
            .set({ status: "active" })
            .where(
                and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, locationId))
            );
    });

    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}

async function handleSquarePaymentFailed(ctx: {
    invoiceId: string;
    memberPlanId: string;
    memberId: string;
    locationId: string;
    payment: Square.Payment;
    amount: number;
    feesAmount: number;
    paymentType: PaymentType;
    paymentMethodId: string | null;
    now: Date;
    statusUpper: string;
}) {
    const {
        invoiceId,
        memberPlanId,
        memberId,
        locationId,
        payment,
        amount,
        feesAmount,
        paymentType,
        paymentMethodId,
        now,
        statusUpper,
    } = ctx;

    const [invoice] = await db
        .update(memberInvoices)
        .set({
            status: "unpaid",
            paid: false,
            updated: now,
        })
        .where(eq(memberInvoices.id, invoiceId))
        .returning({
            description: memberInvoices.description,
            currency: memberInvoices.currency,
            total: memberInvoices.total,
            subTotal: memberInvoices.subTotal,
            tax: memberInvoices.tax,
            items: memberInvoices.items,
        });

    if (!invoice) throw new Error("Invoice not found for Square payment failure");

    const txValues = {
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status: "failed" as const,
        failedReason: statusUpper,
        failedCode: payment.status ?? statusUpper,
        locationId,
        memberId,
        invoiceId,
        paymentMethodId,
        paymentType,
        chargeDate: now,
        feesAmount,
        metadata: { memberPlanId },
        updated: now,
    };

    const existingTransaction = await db.query.transactions.findFirst({
        where: (transaction, { eq: e }) => e(transaction.invoiceId, invoiceId),
    });

    if (existingTransaction) {
        await db.update(transactions).set(txValues).where(eq(transactions.id, existingTransaction.id));
    } else {
        await db.insert(transactions).values(txValues);
    }

    if (!memberPlanId.startsWith("pkg_")) {
        await db
            .update(memberSubscriptions)
            .set({ status: "past_due" })
            .where(eq(memberSubscriptions.id, memberPlanId));
    }

    console.log("[SQUARE WEBHOOK] Payment failed/canceled for invoice", invoiceId);
}