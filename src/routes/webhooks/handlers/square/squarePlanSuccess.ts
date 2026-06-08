import { memberInvoices, memberSubscriptions, memberPackages, transactions } from "@subtrees/schemas";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import type { PaymentType } from "@subtrees/types";


interface HandleSquarePlanSuccessProps {
    invoiceId: string;
    paymentType: PaymentType;
    paymentMethodId: string | undefined;
    feeAmount: number;
    squarePaymentId: string | undefined;
    squarePaymentStatus: string | undefined;
    amount: number;
    receiptUrl: string | null;
}

export async function handleSquarePlanSuccess(props: HandleSquarePlanSuccessProps) {
    const { invoiceId, paymentType, paymentMethodId,
        feeAmount, squarePaymentId, squarePaymentStatus, amount, receiptUrl } = props;

    const now = new Date();
    const [invoice] = await db.update(memberInvoices).set({
        status: "paid",
        paid: true,
        receiptUrl,
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
        status: "paid" as const,
        paymentMethodId: paymentMethodId ?? null,
        paymentType,
        chargeDate: now,
        feeAmount,
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
        if (isPackage) {
            await db.update(memberPackages).set({
                status: "active",
            }).where(eq(memberPackages.id, memberPlanId));
        } else {
            await db.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: "active",
            }).where(eq(memberSubscriptions.id, memberPlanId));
        }
    }
    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}