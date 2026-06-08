import { Elysia, t } from "elysia";
import { WebhooksHelper } from "square";
import type { NoteData, SquareWebhookPayment } from "./handlers/square/type";
import { handleSquarePlanSuccess } from "./handlers/square/squarePlanSuccess";
import { handleSquarePlanFail } from "./handlers/square/squarePlanFail";

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
        case "payment.updated":
            if ((payment.status || "").toUpperCase() === "COMPLETED") {
                await handleSquarePaymentSuccess(payment);
            } else {
                await handleSquarePaymentFailed(payment);
            }
            break;

    }
}

async function handleSquarePaymentSuccess(payment: SquareWebhookPayment) {
    const { app_fee_money, reference_id, total_money } = payment;
    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;


    if (!reference_id) {
        throw new Error("No  reference_id");
    }

    const squarePaymentId = payment.id;
    const squarePaymentStatus = payment.status;
    const amount = total_money?.amount ?? 0;
    const feesAmount = getSquareProcessingFee(payment);
    const paymentType = payment.source_type === "CARD" ? "card" : "cash";
    const receiptUrl = payment.receipt_url ?? null;

    if (reference_id?.startsWith("ord_")) {
        const orderId = reference_id;
        // TODO: Handle order success
    }

    if (reference_id.startsWith("inv_")) {
        const invoiceId = reference_id;
        await handleSquarePlanSuccess({
            invoiceId,
            paymentType,
            paymentMethodId: pmid,
            feeAmount: feesAmount,
            receiptUrl,
            amount,
            squarePaymentId,
            squarePaymentStatus,
        });
    }

}

async function handleSquarePaymentFailed(payment: SquareWebhookPayment) {
    const { app_fee_money, reference_id, total_money } = payment;

    const parsedNote = parseNote(payment.note ?? "");
    const { pmid } = parsedNote;
    if (!reference_id) {
        throw new Error("No  reference_id");
    }

    const amount = total_money?.amount ?? 0;
    const feesAmount = getSquareProcessingFee(payment);
    const paymentType = payment.source_type === "CARD" ? "card" : "cash";
    const squarePaymentId = payment.id;
    const squarePaymentStatus = payment.status;
    const failedReason = getSquareFailureReason(payment, payment.status ?? "");
    const failedCode = getSquareFailureCode(payment, payment.status ?? "");
    if (reference_id?.startsWith("ord_")) {
        const orderId = reference_id;
        // TODO: Handle order failed
    }

    if (reference_id.startsWith("inv_")) {
        const invoiceId = reference_id;
        await handleSquarePlanFail({
            invoiceId,
            paymentType,
            paymentMethodId: pmid,
            feeAmount: feesAmount,
            amount,
            failedReason,
            failedCode,
            squarePaymentId,
            squarePaymentStatus,
        });
    }
}


// async function handleReconcileInvoice(payment: SquareWebhookPayment) {
//     const invoiceId = payment.reference_id;
//     const parsedNote = parseNote(payment.note ?? "");
//     const { pmid } = parsedNote;
//     if (!invoiceId) {
//         console.warn("[SQUARE WEBHOOK] payment has no reference_id; skipping");
//         return;
//     }

//     const status = (payment.status || "").toUpperCase();
//     const isCompleted = status === "COMPLETED";
//     const isFailed = ["FAILED", "CANCELED"].includes(status);
//     if (!isCompleted && !isFailed) return;

//     const amount = payment.total_money?.amount ?? 0;
//     const feeAmount = getSquareProcessingFee(payment);
//     const paymentType = payment.source_type === "CARD" ? "card" : "cash";
//     const squarePaymentId = payment.id;
//     const squarePaymentStatus = payment.status;
//     const failedReason = getSquareFailureReason(payment, status);
//     const failedCode = getSquareFailureCode(payment, status);
//     if (isCompleted) {
//         await handleSquarePlanSuccess({
//             invoiceId,
//             paymentType,
//             paymentMethodId: pmid,
//             feeAmount,
//             amount,
//             squarePaymentId,
//             squarePaymentStatus,
//         });
//     } else {
//         await handleSquarePlanFail({
//             invoiceId,
//             paymentType,
//             paymentMethodId: pmid,
//             feeAmount,
//             amount,
//             failedReason,
//             failedCode,
//             squarePaymentId,
//             squarePaymentStatus,
//         });
//     }
// }


function getSquareProcessingFee(payment: SquareWebhookPayment) {
    const feeAmount = payment.app_fee_money?.amount ?? 0;
    const processingFee = payment.processing_fee?.reduce((acc, curr) => acc + (curr.amount_money?.amount ?? 0), 0);
    return feeAmount + (processingFee ?? 0);
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



function getSquareFailureReason(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.detail || statusUpper;
}

function getSquareFailureCode(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.code || payment.status || statusUpper;
}

