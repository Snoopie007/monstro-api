import type { Currency } from "square/";

export type SquareWebhookPayment = {
    id?: string;
    amount_money?: {
        amount?: number;
        currency?: Currency;
    };
    app_fee_money?: {
        amount?: number;
        currency?: Currency;
    };
    total_money?: {
        amount?: number;
        currency?: Currency;
    };
    processing_fee?: [
        {
            amount_money?: {
                amount?: number;
                currency?: Currency;
            };
            effective_at?: string;
            type?: string;
        }
    ]
    source_type?: "CARD" | "BANK_ACCOUNT" | "CASH";
    location_id?: string;
    reference_id?: string;
    status?: "APPROVED" | "FAILED" | "CANCELED" | "COMPLETED" | "PENDING" | string;
    note?: string;
    receipt_number?: string;
    receipt_url?: string;
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
};

export type NoteData = {
    description: string;
    invId: string;
    mid: string;
    lid: string;
    subId: string;
    pmid: string;
    orderId: string;
};

export type InvoiceMetadata = {
    paymentMethodId?: string;
};

// export type SquareInvoiceTransactionInput = {
//     invoice: {
//         description: string | null;
//         currency: BillingCurrency;
//         total: number;
//         subTotal: number;
//         tax: number;
//         items: any[] | null;
//     };
//     invoiceId: string;
//     memberId: string;
//     locationId: string;
//     payment: SquareWebhookPayment;
//     amount: number;
//     feeAmount: number;
//     paymentMethodId: string | null;
//     paymentType: PaymentType;
//     status: "paid" | "failed";
//     failedReason?: string | null;
//     failedCode?: string | null;
//     now: Date;
// };
