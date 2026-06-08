import { memberInvoices, memberSubscriptions, memberPackages, transactions } from "@subtrees/schemas";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import type { PaymentType } from "@subtrees/types";


interface HandleSquarePlanFailProps {
    invoiceId: string;
    paymentType: PaymentType;
    paymentMethodId: string | undefined;
    feeAmount: number;
    squarePaymentId: string | undefined;
    squarePaymentStatus: string | undefined;
    amount: number;
    failedReason: string | null;
    failedCode: string | null;
}

export async function handleSquarePlanFail(props: HandleSquarePlanFailProps) {
    const { invoiceId, paymentType, paymentMethodId,
        feeAmount, squarePaymentId, squarePaymentStatus, amount, failedReason, failedCode } = props;

    const now = new Date();
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


    const values = {
        ...invoice,
        invoiceId,
        total: amount,
        type: "inbound" as const,
        status: "failed" as const,
        paymentMethodId: paymentMethodId ?? null,
        paymentType,
        chargeDate: now,
        feeAmount,
        failedReason,
        failedCode,
        metadata: {
            gatewayService: "square" as const,
            squarePaymentId,
            squarePaymentStatus,
            memberPlanId,
        },
        updated: now,
    };

    await db.insert(transactions).values(values).onConflictDoUpdate({
        target: transactions.invoiceId,
        set: values,
    });

    if (memberPlanId) {
        const isPackage = memberPlanId.startsWith("pkg_");
        if (!isPackage) {
            await db.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: "past_due",
            }).where(eq(memberSubscriptions.id, memberPlanId));
        }
    }
    console.log("[SQUARE WEBHOOK] Payment failed for invoice", invoiceId);
}