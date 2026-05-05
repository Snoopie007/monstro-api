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
import { and, eq } from "drizzle-orm";
import type { Event, PaymentCreatedEventData, Currency } from "square/";


type SquareWebhookPayment = {
    amount_money: {
        amount: number;
        currency: Currency;
    };
    app_fee_money: {
        amount: number;
        currency: Currency;
    };
    total_money: {
        amount: number;
        currency: Currency;
    };
    processing_fee: {
        effective_at: string;
        type: string;
        amount_money: {
            amount: number;
            currency: Currency;
        };
    };
    source_type: 'CARD' | 'BANK_ACCOUNT' | 'CASH';
    location_id: string;
    reference_id: string;
    status: 'APPROVED' | 'FAILED' | 'CANCELED' | 'COMPLETED' | 'PENDING';
    note: string;
    receipt_number: string;
    card_details: {
        status: string;
        card: {
            card_brand: string;
            last_4: string;
            exp_month: number;
            exp_year: number;
            fingerprint: string;
            card_type: string;
            prepaid_type: string;
            bin: string;
        };
        errors?: Array<{
            code: string;
            detail?: string;
            category?: string;
        }>;
        card_payment_timeline?: {
            authorized_at?: string;
            captured_at?: string;
            voided_at?: string;
        };
    };

};

const ALLOWED_EVENTS = [
    "payment.created",
    "payment.updated",
];

// Generate a signature from the notification url, signature key,
// and request body and compare it to the Square signature header.
async function isFromSquare(signature: string, body: string): Promise<boolean> {
    return await WebhooksHelper.verifySignature({
        requestBody: body,
        signatureHeader: signature,
        signatureKey: '6r9NXRT-19LC5EddUyrm1w',
        notificationUrl: 'https://3e26-70-26-74-111.ngrok-free.app/webhooks/square'
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
            const event = JSON.parse(rawText) as Event;
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

async function processSquareEvent(event: Event): Promise<void> {

    const type = event.type;
    // Safe guard
    if (!type) return;
    if (!ALLOWED_EVENTS.includes(type)) return;
    if (!event.data) return

    switch (type) {
        case "payment.created":
            const data = event.data as PaymentCreatedEventData;
            const payment = data.object?.payment as SquareWebhookPayment;
            if (!payment) return;
            console.log(payment)
            if (payment.status === 'COMPLETED') {
                await handleSquarePaymentSuccess(payment);
            } else {
                await handleSquarePaymentFailed(payment);
            }
            break;
        case "payment.updated":
            break;
    }
}
type NoteData = {
    description: string;
    mid: string;
    lid: string;
    subId: string;
    pmid: string;
};
function parseNote(note: string): Partial<NoteData> {
    const parts = note.split('|');
    const data: Partial<NoteData> = {
        description: '',
        mid: '',
        lid: '',
        subId: '',
        pmid: '',
    };
    for (const part of parts) {
        const keyVal = part.match(/^(\w+):(.*)$/);
        if (keyVal) {
            data[keyVal[1] as keyof NoteData] = keyVal[2];
        }
    }
    return data;
}

async function handleSquarePaymentSuccess(payment: SquareWebhookPayment) {

    const { app_fee_money, reference_id, total_money,
        processing_fee
    } = payment
    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;

    const now = new Date();

    const invoiceId = reference_id;
    if (!invoiceId) {
        throw new Error("Invalid invoice");
    }
    const amount = total_money.amount;
    const feesAmount = processing_fee?.amount_money?.amount ?? 0 + app_fee_money.amount;


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
    if (!memberPlanId || !memberId || !locationId) {
        throw new Error("Invalid invoice");
    }
    await db.insert(transactions).values({
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound",
        status: "paid",
        paymentMethodId: pmid,
        paymentType: payment.source_type === 'CARD' ? "card" : "cash",
        chargeDate: now,
        feeAmount: feesAmount,
        metadata: {
            memberPlanId: invoice.memberPlanId,
        }
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
            eq(memberLocations.locationId, locationId)
        ));
    });
    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}


async function handleSquarePaymentFailed(payment: SquareWebhookPayment) {

    const { app_fee_money, card_details, reference_id, total_money,
        processing_fee
    } = payment
    // Convert Square's note field (a delimited string) into a JSON object.
    // Assuming note format: `${description}|mid:${mid}|lid:${lid}|subId:${sub.id}|pmid:${paymentMethodId}`


    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;
    const now = new Date();

    const invoiceId = reference_id;
    if (!invoiceId) {
        throw new Error("Invalid invoice");
    }
    const amount = total_money.amount;
    const feesAmount = processing_fee?.amount_money?.amount ?? 0 + app_fee_money.amount;


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
    if (!memberPlanId || !memberId || !locationId) {
        throw new Error("Invalid invoice");
    }

    const error = card_details?.errors?.[0];
    const failedReason = error?.detail ?? null;
    const failedCode = error?.code ?? null;

    await db.insert(transactions).values({
        ...invoice,
        total: amount,
        items: invoice.items ?? [],
        type: "inbound",
        status: "failed",
        failedReason,
        failedCode,
        paymentMethodId: pmid,
        paymentType: payment.source_type === 'CARD' ? "card" : "cash",
        chargeDate: now,
        feeAmount: feesAmount,
        metadata: {
            memberPlanId: invoice.memberPlanId,
        }
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
            eq(memberLocations.locationId, locationId)
        ));
    });
    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}
