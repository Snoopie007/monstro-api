import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { memberPackages, memberInvoices, transactions } from "@subtrees/schemas";
import {
    authorizeReferenceIdForTransaction,
    calculateChargeDetails,
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs,
    triggerPurchase,
    fetchPromoDiscount,
    calculateThresholdDate,
    getCheckoutContext,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import { broadcastAchievement } from "@/libs/broadcast/achievements";

export type EnrollPkgInput = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
    attemptId: string;
    startDate?: string;
    expireDate?: string;
    totalClassLimit?: number;
};

export async function handleEnrollPackage(props: EnrollPkgInput) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId, attemptId, startDate, expireDate, totalClassLimit } = props;
    const transactionId = stableCheckoutTransactionId("package", lid, mid, attemptId);
    const authorizeReferenceId = authorizeReferenceIdForTransaction(transactionId);
    const existing = await db.query.transactions.findFirst({
        where: (row, { and, eq }) => and(eq(row.id, transactionId), eq(row.locationId, lid), eq(row.memberId, mid)),
    });
    if (existing) {
        if (existing.status === "pending") throw new CheckoutError(202, "Payment is pending; do not retry");
        if (existing.status === "failed") throw new CheckoutError(400, existing.failedReason || "Payment was declined");
        if (existing.status !== "paid") throw new CheckoutError(500, "Unexpected transaction status");
        const invoice = await db.query.memberInvoices.findFirst({
            where: (row, { eq }) => eq(row.transactionId, transactionId),
        });
        if (!invoice) throw new CheckoutError(202, "Payment is paid and package is being finalized");
        return { ok: true, unsignedDocs: [] as string[] };
    }

    const [checkout, pricing] = await Promise.all([
        getCheckoutContext({ lid, mid }),
        db.query.memberPlanPricing.findFirst({
            where: (row, { eq }) => eq(row.id, priceId),
            with: { plan: true },
        }),
    ]);
    if (!pricing?.plan) throw new CheckoutError(404, "Pricing not found");

    const { ml, gateway, taxRates, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const { settings, usagePercent, currency } = locationState;
    const discount = await fetchPromoDiscount(promoId ?? undefined, pricing);
    const taxRate = taxRates.find((rate) => rate.isDefault) || taxRates[0];
    const productName = `${pricing.plan.name}/${pricing.name}`;
    const description = `Payment for ${productName}`;
    const chargeDetails = calculateChargeDetails({
        amount: pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        usagePercent: usagePercent || 0,
        paymentType,
        isRecurring: false,
        passOnFees: settings?.passOnFees || false,
    });
    const packageStart = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(packageStart.getTime())) throw new CheckoutError(400, "Invalid package start date");
    const endDate = expireDate
        ? new Date(expireDate)
        : pricing.expireThreshold && pricing.expireInterval
            ? calculateThresholdDate({
                startDate: packageStart,
                threshold: pricing.expireThreshold,
                interval: pricing.expireInterval,
            })
            : undefined;
    if (endDate && Number.isNaN(endDate.getTime())) throw new CheckoutError(400, "Invalid package expiration date");
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
            authorizeReferenceId,
        } : {}),
        gatewayService: gateway.service,
        checkoutKind: "package",
        checkoutAttemptId: attemptId,
        memberPlanPricingId: pricing.id,
        productName,
        discount,
        packageClassLimit: totalClassLimit ?? pricing.plan.totalClassLimit ?? 0,
        packageStartAt: packageStart.toISOString(),
        ...(endDate ? { packageExpireAt: endDate.toISOString() } : {}),
    };

    const charge: ChargeWithGatewayResult = await chargeWithGateway({
        gateway,
        gatewayCustomerId,
        paymentMethodId,
        transactionId,
        authorizeReferenceId,
        paymentType,
        total: chargeDetails.total,
        feesAmount: chargeDetails.feesAmount,
        currency,
        description,
        referenceId: transactionId,
        note: `transactionId:${transactionId}|mid:${mid}|lid:${lid}|priceId:${pricing.id}`,
        metadata: { locationId: lid, memberId: mid, transactionId },
    });

    switch (charge.status) {
        case "approved": {
            const now = new Date();
            let unsignedDocs: string[] = [];
            await db.transaction(async (tx) => {
                const [created] = await tx.insert(transactions).values({
                    id: transactionId,
                    memberId: mid,
                    locationId: lid,
                    total: chargeDetails.total,
                    subTotal: chargeDetails.subTotal,
                    tax: chargeDetails.tax,
                    feeAmount: chargeDetails.feesAmount,
                    description,
                    type: "inbound",
                    status: "paid",
                    paymentMethodId,
                    paymentType,
                    currency,
                    chargeDate: now,
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    activities: [{
                        at: now.toISOString(),
                        reason: "Payment succeeded",
                        paymentType: charge.paymentType ?? paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }],
                }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
                if (!created) throw new CheckoutError(202, "Payment is being finalized; do not retry");

                const [pkg] = await tx.insert(memberPackages).values({
                    locationId: lid,
                    memberId: mid,
                    totalClassLimit: totalClassLimit ?? pricing.plan.totalClassLimit ?? 0,
                    memberPlanPricingId: pricing.id,
                    paymentType,
                    startDate: packageStart,
                    expireDate: endDate,
                    status: "active",
                }).returning({ id: memberPackages.id });
                if (!pkg) throw new Error("Failed to create package");

                const [invoice] = await tx.insert(memberInvoices).values({
                    ...chargeDetails,
                    description,
                    items: [{
                        name: productName,
                        quantity: 1,
                        price: chargeDetails.unitCost,
                        discount,
                    }],
                    memberId: mid,
                    locationId: lid,
                    memberPlanId: pkg.id,
                    paymentType,
                    currency,
                    dueDate: new Date(),
                    transactionId,
                    status: "paid",
                    paid: true,
                }).returning({ id: memberInvoices.id });
                if (!invoice) throw new Error("Failed to create invoice");

                unsignedDocs = await createEnrollUnsignedDocs(tx, {
                    mid,
                    lid,
                    memberPlanId: pkg.id,
                    contractId: pricing.plan.contractId,
                    waiverId: locationState.waiverId,
                    signedWaiverId: ml.signedWaiverId,
                });
            });

            triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((achievement) => {
                if (achievement) broadcastAchievement(ml.member.userId, achievement);
            }).catch((error) => console.error("Error triggering purchase:", error));
            return { ok: true, unsignedDocs };
        }
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                memberId: mid,
                locationId: lid,
                total: chargeDetails.total,
                subTotal: chargeDetails.subTotal,
                tax: chargeDetails.tax,
                feeAmount: chargeDetails.feesAmount,
                description,
                type: "inbound",
                status: "failed",
                paymentMethodId,
                paymentType,
                currency,
                chargeDate: now,
                paymentIntentId: charge.paymentIntentId,
                failedReason: charge.failureReason,
                failedCode: charge.failureCode,
                metadata: { ...metadata, ...charge.gatewayMetadata },
                activities: [{
                    at: now.toISOString(),
                    reason: `Payment failed: ${charge.failureReason}`,
                    paymentType: charge.paymentType ?? paymentType,
                    brand: charge.brand,
                    last4: charge.last4,
                }],
            }).onConflictDoNothing({ target: transactions.id });
            throw new CheckoutError(400, charge.failureReason);
        }
        case "uncertain":
            throw new CheckoutError(202, "Payment status is unknown; do not retry");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
