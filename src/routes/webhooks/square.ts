import { Elysia, t } from "elysia";
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
import type { Currency } from "square/";
import type { Currency as BillingCurrency } from "@subtrees/types/currency";

type SquareWebhookPayment = {
    id?: string;
    amount_money?: {
        amount?: number;
        currency?: Currency;
    };
    amountMoney?: {
        amount?: number;
        currency?: Currency;
    };
    app_fee_money?: {
        amount?: number;
        currency?: Currency;
    };
    appFeeMoney?: {
        amount?: number;
        currency?: Currency;
    };
    total_money?: {
        amount?: number;
        currency?: Currency;
    };
    totalMoney?: {
        amount?: number;
        currency?: Currency;
    };
    processing_fee?: {
        effective_at?: string;
        type?: string;
        amount_money?: {
            amount?: number;
            currency?: Currency;
        };
    };
    source_type?: "CARD" | "BANK_ACCOUNT" | "CASH";
    sourceType?: "CARD" | "BANK_ACCOUNT" | "CASH";
    location_id?: string;
    reference_id?: string;
    referenceId?: string;
    status?: "APPROVED" | "FAILED" | "CANCELED" | "COMPLETED" | "PENDING" | string;
    note?: string;
    receipt_number?: string;
    receiptUrl?: string;
    card_details?: {
        status?: string;
        card?: {
            id?: string;
            card_brand?: string;
            last_4?: string;
            exp_month?: number;
            exp_year?: number;
            fingerprint?: string;
            card_type?: string;
            prepaid_type?: string;
            bin?: string;
        };
        errors?: Array<{
            code?: string;
            detail?: string;
            category?: string;
        }>;
    };
    cardDetails?: {
        status?: string;
        card?: {
            id?: string;
        };
        errors?: Array<{
            code?: string;
            detail?: string;
            category?: string;
        }>;
    };
};

type NoteData = {
    description: string;
    invId: string;
    mid: string;
    lid: string;
    subId: string;
    pmid: string;
};

type InvoiceMetadata = {
    paymentMethodId?: string;
};

type SquareInvoiceTransactionInput = {
    invoice: {
        description: string | null;
        currency: BillingCurrency;
        total: number;
        subTotal: number;
        tax: number;
        items: any[] | null;
    };
    invoiceId: string;
    memberId: string;
    locationId: string;
    payment: SquareWebhookPayment;
    amount: number;
    feeAmount: number;
    paymentMethodId: string | null;
    paymentType: PaymentType;
    status: "paid" | "failed";
    failedReason?: string | null;
    failedCode?: string | null;
    now: Date;
};

const ALLOWED_EVENTS = ["payment.created", "payment.updated"];

const isProd = process.env.BUN_ENV === "production";
const url = isProd
    ? "https://api.monstro-x.com/webhooks/square"
    : "https://3e26-70-26-74-111.ngrok-free.app/webhooks/square";

// Generate a signature from the notification URL, signature key, and request body.
async function isFromSquare(signature: string, body: string): Promise<boolean> {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!signatureKey) {
        return false;
    }

    return await WebhooksHelper.verifySignature({
        requestBody: body,
        signatureHeader: signature,
        signatureKey,
        notificationUrl: url,
    });
}

export function squareWebhookRoutes(app: Elysia) {
    app.post("/square", async ({ request, headers, status }) => {
        const signature = headers["x-square-hmacsha256-signature"];
        if (typeof signature !== "string") {
            return status(400, { error: "[SQUARE WEBHOOK] Missing signature header" });
        }

        try {
            const rawText = await request.text();
            if (!await isFromSquare(signature, rawText)) {
                return status(400, { error: "[SQUARE WEBHOOK] Invalid signature" });
            }

            const event = JSON.parse(rawText) as { type?: string; data?: { object?: { payment?: SquareWebhookPayment } } };
            processSquareEvent(event).catch((err) => {
                console.error("[SQUARE WEBHOOK] Failed to process event:", err);
            });
            return status(200, { message: "[SQUARE WEBHOOK] Event accepted" });
        } catch (err) {
            console.error("[SQUARE WEBHOOK] Failed to process event:", err);
            return status(500, { error: "[SQUARE WEBHOOK] Failed to process event" });
        }
    }, {
        headers: t.Object({
            "x-square-hmacsha256-signature": t.String(),
        }),
        parse: "none",
    });
    return app;
}

async function processSquareEvent(event: { type?: string; data?: { object?: { payment?: SquareWebhookPayment } } }): Promise<void> {
    if (!event.type || !ALLOWED_EVENTS.includes(event.type)) return;

    const payment = event.data?.object?.payment;
    if (!payment) {
        console.warn(`[SQUARE WEBHOOK] ${event.type} without payment object`);
        return;
    }

    switch (event.type) {
        case "payment.created":
            if ((payment.status || "").toUpperCase() === "COMPLETED") {
                await handleSquarePaymentSuccess(payment);
            } else {
                await handleSquarePaymentFailed(payment);
            }
            break;
        case "payment.updated":
            await handleReconcileInvoice(payment);
            break;
    }
}

async function handleSquarePaymentSuccess(payment: SquareWebhookPayment) {
    const { app_fee_money, reference_id, total_money, processing_fee } = payment;
    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;

    const now = new Date();

    const invoiceId = reference_id;
    if (!invoiceId) {
        throw new Error("Invalid invoice");
    }
    const amount = total_money?.amount ?? 0;
    const feesAmount = (processing_fee?.amount_money?.amount ?? 0) + (app_fee_money?.amount ?? 0);

    const [invoice] = await db.update(memberInvoices).set({
        status: "paid",
        paid: true,
        updated: now,
    }).where(eq(memberInvoices.id, invoiceId)).returning({
        description: memberInvoices.description,
        currency: memberInvoices.currency,
        locationId: memberInvoices.locationId,
        memberId: memberInvoices.memberId,
        memberPlanId: memberInvoices.memberPlanId,
        total: memberInvoices.total,
        subTotal: memberInvoices.subTotal,
        tax: memberInvoices.tax,
        items: memberInvoices.items,
    });

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const memberPlanId = invoice.memberPlanId;
    const memberId = invoice.memberId;
    const locationId = invoice.locationId;
    if (!memberId || !locationId) {
        throw new Error("Invalid invoice");
    }

    if (!memberPlanId) {
        // One-off invoices do not have memberPlanId. They should reconcile the
        // invoice and transaction only, then mark the member/location active.
        await handleOneOffInvoicePayment({
            invoice,
            invoiceId,
            memberId,
            locationId,
            payment,
            amount,
            feeAmount: feesAmount,
            paymentMethodId: pmid || getSquarePaymentMethodId(payment),
            paymentType: payment.source_type === "CARD" ? "card" : "cash",
            status: "paid",
            now,
        });
        return;
    }

    await db.insert(transactions).values({
        ...invoice,
        total: amount,
        type: "inbound",
        status: "paid",
        paymentMethodId: pmid,
        paymentType: payment.source_type === "CARD" ? "card" : "cash",
        chargeDate: now,
        feeAmount: feesAmount,
        metadata: {
            memberPlanId: invoice.memberPlanId,
        },
    });

    const isPackage = invoice.memberPlanId?.startsWith("pkg_");
    await db.transaction(async (tx) => {
        if (isPackage) {
            await tx.update(memberPackages).set({
                status: "active",
            }).where(eq(memberPackages.id, memberPlanId));
        } else {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: pmid,
                status: "active",
            }).where(eq(memberSubscriptions.id, memberPlanId));
        }
        await tx.update(memberLocations).set({
            status: "active",
        }).where(and(
            eq(memberLocations.memberId, memberId),
            eq(memberLocations.locationId, locationId),
        ));
    });
    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}

async function handleSquarePaymentFailed(payment: SquareWebhookPayment) {
    const { app_fee_money, card_details, reference_id, total_money, processing_fee } = payment;

    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;
    const now = new Date();

    const invoiceId = reference_id;
    if (!invoiceId) {
        throw new Error("Invalid invoice");
    }
    const amount = total_money?.amount ?? 0;
    const feesAmount = (processing_fee?.amount_money?.amount ?? 0) + (app_fee_money?.amount ?? 0);

    const [invoice] = await db.update(memberInvoices).set({
        status: "unpaid",
        paid: false,
        updated: now,
    }).where(eq(memberInvoices.id, invoiceId)).returning({
        description: memberInvoices.description,
        currency: memberInvoices.currency,
        locationId: memberInvoices.locationId,
        memberId: memberInvoices.memberId,
        memberPlanId: memberInvoices.memberPlanId,
        total: memberInvoices.total,
        subTotal: memberInvoices.subTotal,
        tax: memberInvoices.tax,
        items: memberInvoices.items,
    });

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const memberPlanId = invoice.memberPlanId;
    const memberId = invoice.memberId;
    const locationId = invoice.locationId;
    if (!memberId || !locationId) {
        throw new Error("Invalid invoice");
    }

    const error = card_details?.errors?.[0];
    const failedReason = error?.detail ?? null;
    const failedCode = error?.code ?? null;

    if (!memberPlanId) {
        // Failed one-off payments should not mark a subscription/package or the
        // whole member/location as past_due; only the invoice transaction changes.
        await handleOneOffInvoicePayment({
            invoice,
            invoiceId,
            memberId,
            locationId,
            payment,
            amount,
            feeAmount: feesAmount,
            paymentMethodId: pmid || getSquarePaymentMethodId(payment),
            paymentType: payment.source_type === "CARD" ? "card" : "cash",
            status: "failed",
            failedReason,
            failedCode,
            now,
        });
        return;
    }

    await db.insert(transactions).values({
        ...invoice,
        total: amount,
        type: "inbound",
        status: "failed",
        failedReason,
        failedCode,
        paymentMethodId: pmid,
        paymentType: payment.source_type === "CARD" ? "card" : "cash",
        chargeDate: now,
        feeAmount: feesAmount,
        metadata: {
            memberPlanId: invoice.memberPlanId,
        },
    });

    await db.transaction(async (tx) => {
        await tx.update(memberSubscriptions).set({
            gatewayPaymentId: pmid,
            status: "past_due",
        }).where(eq(memberSubscriptions.id, memberPlanId));
        await tx.update(memberLocations).set({
            status: "past_due",
        }).where(and(
            eq(memberLocations.memberId, memberId),
            eq(memberLocations.locationId, locationId),
        ));
    });
    console.log("[SQUARE WEBHOOK] Payment failed for invoice", invoiceId);
}

async function handleOneOffInvoicePayment(ctx: SquareInvoiceTransactionInput) {
    const {
        invoice,
        invoiceId,
        memberId,
        locationId,
        payment,
        amount,
        feeAmount,
        paymentMethodId,
        paymentType,
        status,
        failedReason = null,
        failedCode = null,
        now,
    } = ctx;

    const values = {
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status,
        failedReason: status === "paid" ? null : failedReason,
        failedCode: status === "paid" ? null : failedCode,
        locationId,
        memberId,
        invoiceId,
        paymentMethodId,
        paymentIntentId: payment.id ?? null,
        paymentType,
        chargeDate: now,
        feeAmount,
        metadata: {
            invoiceId,
            gatewayService: "square" as const,
            squarePaymentId: payment.id,
            chargeId: payment.id,
            squarePaymentStatus: payment.status,
        },
        updated: now,
    };

    const existingTransaction = await db.query.transactions.findFirst({
        where: (transaction, { eq: e }) => e(transaction.invoiceId, invoiceId),
    });

    if (existingTransaction) {
        await db.update(transactions).set(values).where(eq(transactions.id, existingTransaction.id));
    } else {
        await db.insert(transactions).values(values);
    }

    if (status === "paid") {
        await db
            .update(memberLocations)
            .set({ status: "active" })
            .where(and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, locationId)));
    }

    console.log(`[SQUARE WEBHOOK] One-off payment ${status} for invoice`, invoiceId);
}

async function handleReconcileInvoice(payment: SquareWebhookPayment) {
    const invoiceId = getSquareReferenceId(payment);
    if (!invoiceId) {
        console.warn("[SQUARE WEBHOOK] payment has no reference_id; skipping");
        return;
    }

    const statusUpper = (payment.status || "").toUpperCase();
    const isCompleted = statusUpper === "COMPLETED";
    const isFailed = statusUpper === "FAILED" || statusUpper === "CANCELED";
    if (!isCompleted && !isFailed) return;

    const invoiceRow = await db.query.memberInvoices.findFirst({
        where: (inv, { eq: e }) => e(inv.id, invoiceId),
    });
    if (!invoiceRow) {
        console.warn("[SQUARE WEBHOOK] Invoice not found for reference_id:", invoiceId);
        return;
    }

    const { memberPlanId, memberId, locationId } = invoiceRow;
    if (!memberId || !locationId) {
        console.warn("[SQUARE WEBHOOK] Invoice missing relation ids:", invoiceId);
        return;
    }

    // One-off invoices do not have memberPlanId. Reconciliation only needs the
    // invoice/member/location ids; subscription/package updates are conditional.
    const invoiceMetadata = invoiceRow.metadata as InvoiceMetadata | null | undefined;
    const now = new Date();
    const amount = getSquareAmount(payment);
    const feeAmount = getSquareFeeAmount(payment);
    const paymentType = getSquarePaymentType(payment);
    const paymentMethodId = getSquarePaymentMethodId(payment, invoiceMetadata);

    // Square webhooks are the source of truth for async settlement. First mark
    // the invoice paid/unpaid, then upsert the linked transaction so duplicate
    // webhook events update the same transaction instead of creating duplicates.
    const [invoice] = await db
        .update(memberInvoices)
        .set({
            status: isCompleted ? "paid" : "unpaid",
            paid: isCompleted,
            ...(isCompleted ? { receiptUrl: payment.receiptUrl ?? undefined } : {}),
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

    if (!invoice) throw new Error("Invoice not found for Square webhook reconciliation");

    const txValues = {
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound" as const,
        status: isCompleted ? "paid" as const : "failed" as const,
        failedReason: isCompleted ? null : getSquareFailureReason(payment, statusUpper),
        failedCode: isCompleted ? null : getSquareFailureCode(payment, statusUpper),
        locationId,
        memberId,
        invoiceId,
        paymentMethodId,
        paymentIntentId: payment.id ?? null,
        paymentType,
        chargeDate: now,
        feeAmount,
        metadata: {
            ...(memberPlanId ? {
                memberPlanId,
                memberSubscriptionId: memberPlanId,
            } : {}),
            invoiceId,
            gatewayService: "square" as const,
            squarePaymentId: payment.id,
            chargeId: payment.id,
            squarePaymentStatus: payment.status,
        },
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

    await updateRelatedBillingState({
        memberPlanId,
        memberId,
        locationId,
        paymentMethodId,
        isCompleted,
    });

    console.log(`[SQUARE WEBHOOK] Payment ${isCompleted ? "completed" : "failed/canceled"} for invoice`, invoiceId);
}

async function updateRelatedBillingState(ctx: {
    memberPlanId: string | null;
    memberId: string;
    locationId: string;
    paymentMethodId: string | null;
    isCompleted: boolean;
}) {
    const { memberPlanId, memberId, locationId, paymentMethodId, isCompleted } = ctx;

    if (!memberPlanId) {
        if (isCompleted) {
            await db
                .update(memberLocations)
                .set({ status: "active" })
                .where(and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, locationId)));
        }
        return;
    }

    const isPackage = memberPlanId.startsWith("pkg_");
    const existingSubscription = !isPackage
        ? await db.query.memberSubscriptions.findFirst({
            where: (subscription, { eq: e }) => e(subscription.id, memberPlanId),
            columns: { status: true },
        })
        : null;

    if (existingSubscription?.status === "canceled") return;

    await db.transaction(async (tx) => {
        if (isCompleted) {
            if (isPackage) {
                await tx.update(memberPackages).set({ status: "active" }).where(eq(memberPackages.id, memberPlanId));
            } else {
                await tx
                    .update(memberSubscriptions)
                    .set({
                        gatewayPaymentId: paymentMethodId,
                        status: "active",
                    })
                    .where(eq(memberSubscriptions.id, memberPlanId));
            }

            await tx
                .update(memberLocations)
                .set({ status: "active" })
                .where(and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, locationId)));
            return;
        }

        if (!isPackage) {
            await tx
                .update(memberSubscriptions)
                .set({ status: "past_due" })
                .where(eq(memberSubscriptions.id, memberPlanId));
        }
    });
}

function parseNote(note: string): Partial<NoteData> {
    const parts = note.split("|");
    const data: Partial<NoteData> = {
        description: "",
        invId: "",
        mid: "",
        lid: "",
        subId: "",
        pmid: "",
    };

    for (const part of parts) {
        const keyVal = part.match(/^(\w+):(.*)$/);
        if (keyVal) {
            data[keyVal[1] as keyof NoteData] = keyVal[2];
        }
    }

    return data;
}

function getSquarePaymentMethodId(payment: SquareWebhookPayment, invoiceMetadata?: InvoiceMetadata | null) {
    const parsedNote = parseNote(payment.note ?? "");

    return (
        parsedNote.pmid ||
        invoiceMetadata?.paymentMethodId ||
        payment.card_details?.card?.id ||
        payment.cardDetails?.card?.id ||
        payment.id ||
        null
    );
}

function getSquareReferenceId(payment: SquareWebhookPayment) {
    return payment.reference_id || payment.referenceId || null;
}

function getSquareAmount(payment: SquareWebhookPayment) {
    return Number(
        payment.amount_money?.amount ??
        payment.amountMoney?.amount ??
        payment.total_money?.amount ??
        payment.totalMoney?.amount ??
        0
    );
}

function getSquareFeeAmount(payment: SquareWebhookPayment) {
    const appFee = Number(payment.app_fee_money?.amount ?? payment.appFeeMoney?.amount ?? 0);
    const processingFee = Number(payment.processing_fee?.amount_money?.amount ?? 0);
    return appFee + processingFee;
}

function getSquarePaymentType(payment: SquareWebhookPayment): PaymentType {
    const sourceType = payment.source_type || payment.sourceType;
    return sourceType === "BANK_ACCOUNT" ? "us_bank_account" : "card";
}

function getSquareFailureReason(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.detail || payment.cardDetails?.errors?.[0]?.detail || statusUpper;
}

function getSquareFailureCode(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.code || payment.cardDetails?.errors?.[0]?.code || payment.status || statusUpper;
}
