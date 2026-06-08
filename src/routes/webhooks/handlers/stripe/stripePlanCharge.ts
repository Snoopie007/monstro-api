import type Stripe from "stripe";
import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { memberInvoices, memberPackages, memberSubscriptions, memberLocations, transactions } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";


interface HandleStripePlanChargeProps {
    invoiceId: string;
    memberPlanId: string;
    locationId: string;
    memberId: string;
    paymentType: PaymentType;
    failedReason: string | null;
    failedCode: string | null;
    success: boolean;
    receiptUrl: string | null;
    amount: number;
    paymentMethodId: string | null;
    paymentIntentId: string | null;
    feeAmount: number;
    stripeChargeId?: string;
}



export async function handleStripePlanCharge({
    invoiceId,
    memberPlanId,
    locationId,
    memberId,
    amount,
    paymentType,
    failedReason,
    failedCode,
    success,
    receiptUrl,
    paymentMethodId,
    paymentIntentId,
    feeAmount,
    stripeChargeId,
}: HandleStripePlanChargeProps) {

    const isPackage = memberPlanId?.startsWith("pkg_") ?? false;
    const now = new Date();

    const [invoice] = await db.update(memberInvoices).set({
        status: success ? "paid" : "unpaid",
        paid: success,
        receiptUrl,
        updated: now,
    }).where(eq(memberInvoices.id, invoiceId)).returning({
        description: memberInvoices.description,
        currency: memberInvoices.currency,
        total: memberInvoices.total,
        subTotal: memberInvoices.subTotal,
        tax: memberInvoices.tax,
    });


    if (!invoice) {
        throw new Error("Invoice not found");
    }

    const transactionValues = {
        ...invoice,
        invoiceId,
        total: amount,
        type: "inbound" as const,
        status: success ? "paid" as const : "failed" as const,
        failedReason: failedReason,
        failedCode: failedCode,
        locationId,
        memberId,
        paymentMethodId,
        paymentIntentId,
        paymentType,
        chargeDate: now,
        feeAmount: feeAmount,
        metadata: {
            gatewayService: "stripe",
            stripeChargeId,
            memberPlanId,
        }
    };

    await db.insert(transactions).values(transactionValues).onConflictDoUpdate({
        target: transactions.invoiceId,
        set: transactionValues,
    });

    const existingSubscription = memberPlanId && !isPackage
        ? await db.query.memberSubscriptions.findFirst({
            where: (subscription, { eq }) => eq(subscription.id, memberPlanId),
            columns: { status: true },
        })
        : null;
    const canUpdateSubscriptionStatus = existingSubscription?.status !== "canceled";

    await db.transaction(async (tx) => {

        if (isPackage && success) {
            await tx.update(memberPackages).set({
                status: "active",
            }).where(eq(memberPackages.id, memberPlanId));
        } else if (memberPlanId && canUpdateSubscriptionStatus) {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: success ? "active" : "past_due",
            }).where(eq(memberSubscriptions.id, memberPlanId));
        }
    });
}