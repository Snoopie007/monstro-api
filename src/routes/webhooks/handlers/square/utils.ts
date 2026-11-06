import type { NoteData, SquareWebhookPayment } from "./type";

export const ALLOWED_EVENTS = ["payment.created", "payment.updated"];

export function parseNote(note: string): Partial<NoteData> {
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

export function getSquareFailureReason(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.detail || statusUpper;
}

export function getSquareFailureCode(payment: SquareWebhookPayment, statusUpper: string) {
    return payment.card_details?.errors?.[0]?.code || payment.status || statusUpper;
}
