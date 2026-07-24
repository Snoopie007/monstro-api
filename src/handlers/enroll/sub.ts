import { and, eq } from "drizzle-orm";
import type { PaymentType } from "@subtrees/types";
import {
    calculateThresholdDate,
    calculateChargeDetails,
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs,
    triggerPurchase,
    fetchPromoDiscount,
    getCheckoutContext,
    PaymentChargeError,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import {
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import { broadcastAchievement } from "@/libs/broadcast/achievements";
import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";

export type EnrollSubProps = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
    attemptId: string;
};

export async function handleEnrollSubscription(props: EnrollSubProps) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId, attemptId } = props;
    const transactionId = stableCheckoutTransactionId("subscription", lid, mid, attemptId);
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
        if (!invoice) throw new CheckoutError(202, "Payment is paid and subscription is being finalized");
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
    if (!pricing.interval || !pricing.intervalThreshold) {
        throw new CheckoutError(400, "Invalid pricing for subscription plan.");
    }

    const { ml, gateway, taxRates, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const { usagePercent, settings, currency } = locationState;
    const today = new Date();
    const currentPeriodEnd = calculateThresholdDate({
        startDate: today,
        threshold: pricing.intervalThreshold,
        interval: pricing.interval,
    });
    const cancelAt = pricing.expireThreshold && pricing.expireInterval
        ? calculateThresholdDate({
            startDate: today,
            threshold: pricing.expireThreshold,
            interval: pricing.expireInterval,
        })
        : undefined;
    const classCredits = pricing.plan.classLimitInterval === "term"
        ? pricing.plan.totalClassLimit || 0
        : 0;
    const taxRate = taxRates.find((rate) => rate.isDefault) || taxRates[0];
    const discount = await fetchPromoDiscount(promoId ?? undefined, pricing);
    const noGrowthPlan = [1, 2].includes(locationState.planId);
    const chargeDetails = calculateChargeDetails({
        amount: pricing.downpayment || pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        usagePercent: usagePercent || 0,
        paymentType,
        isRecurring: noGrowthPlan,
        passOnFees: settings?.passOnFees || false,
    });
    const productName = pricing.name;
    const description = `${pricing.downpayment ? "Downpayment" : "Payment"} for ${pricing.name}`;
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
            authorizeCustomerProfileId: gatewayCustomerId,
        } : {}),
        gatewayService: gateway.service,
        checkoutKind: "subscription",
        checkoutAttemptId: attemptId,
        memberPlanPricingId: pricing.id,
        productName,
        discount,
        subscriptionStartAt: today.toISOString(),
        subscriptionCurrentPeriodEnd: currentPeriodEnd.toISOString(),
        ...(cancelAt ? { subscriptionCancelAt: cancelAt.toISOString() } : {}),
        classCredits,
    };

    const [created] = await db.insert(transactions).values({
        id: transactionId,
        ...chargeDetails,
        description,
        currency,
        locationId: lid,
        memberId: mid,
        type: "inbound",
        status: "pending",
        paymentMethodId,
        paymentType,
        metadata,
    }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
    if (!created) throw new CheckoutError(202, "Payment is pending; do not retry");

    let charge: ChargeWithGatewayResult;
    try {
        charge = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            transactionId,
            paymentType,
            total: chargeDetails.total,
            feesAmount: chargeDetails.feesAmount,
            currency,
            description,
            referenceId: transactionId,
            note: `transactionId:${transactionId}|mid:${mid}|lid:${lid}|priceId:${pricing.id}`,
            metadata: { locationId: lid, memberId: mid, transactionId },
        });
    } catch (error) {
        await db.update(transactions).set({
            status: "failed",
            failedReason: error instanceof Error ? error.message : "Payment failed",
            failedCode: error instanceof PaymentChargeError ? error.code || "PAYMENT_FAILED" : "PAYMENT_FAILED",
            updated: new Date(),
        }).where(eq(transactions.id, transactionId));
        if (error instanceof PaymentChargeError) throw new CheckoutError(400, error.message);
        throw error;
    }

    switch (charge.status) {
        case "approved": {
            let unsignedDocs: string[] = [];
            const subscription = await db.transaction(async (tx) => {
                const [updated] = await tx.update(transactions).set({
                    status: "paid",
                    chargeDate: today,
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    updated: new Date(),
                }).where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending"))).returning({ id: transactions.id });
                if (!updated) throw new CheckoutError(202, "Payment is being finalized; do not retry");

                const [result] = await tx.insert(memberSubscriptions).values({
                    startDate: today,
                    currentPeriodStart: today,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,
                    cancelAt,
                    classCredits,
                    status: "active",
                    paymentType,
                    gatewayPaymentId: paymentMethodId,
                    metadata: {
                        gatewayIntegrationId: gateway.integrationId,
                        gatewayCustomerId,
                    },
                    memberPlanPricingId: pricing.id,
                }).returning();
                if (!result) throw new Error("Failed to create subscription");

                const [invoice] = await tx.insert(memberInvoices).values({
                    description,
                    items: [{
                        name: productName,
                        quantity: 1,
                        price: chargeDetails.unitCost,
                        discount,
                    }],
                    status: "paid",
                    paid: true,
                    memberPlanId: result.id,
                    memberId: mid,
                    locationId: lid,
                    ...chargeDetails,
                    forPeriodStart: result.currentPeriodStart,
                    forPeriodEnd: result.currentPeriodEnd,
                    currency,
                    dueDate: result.currentPeriodStart,
                    transactionId,
                }).returning({ id: memberInvoices.id });
                if (!invoice) throw new Error("Failed to create invoice");

                unsignedDocs = await createEnrollUnsignedDocs(tx, {
                    mid,
                    lid,
                    memberPlanId: result.id,
                    contractId: pricing.plan.contractId,
                    waiverId: locationState.waiverId,
                    signedWaiverId: ml.signedWaiverId,
                });
                return result;
            });

            const member = ml.member;
            const nextBillingDate = new Date(subscription.currentPeriodEnd);
            if (["month", "year"].includes(pricing.interval)) {
                const payload: SubscriptionJobData = {
                    sid: subscription.id,
                    lid,
                    member: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                    },
                    taxRate: taxRate?.percentage || 0,
                    location: {
                        name: ml.location.name,
                        phone: ml.location.phone,
                        email: ml.location.email,
                    },
                    pricing: {
                        name: pricing.name,
                        price: pricing.price,
                        interval: pricing.interval,
                        intervalThreshold: pricing.intervalThreshold,
                    },
                    discount: discount > 0 ? {
                        amount: discount,
                        duration: pricing.intervalThreshold,
                    } : undefined,
                };
                const renewal = pricing.intervalThreshold === 1
                    ? scheduleCronBasedRenewal({
                        startDate: nextBillingDate,
                        interval: pricing.interval,
                        data: payload,
                    })
                    : scheduleRecursiveRenewal({
                        startDate: nextBillingDate,
                        data: { ...payload, recurrenceCount: 1 },
                    });
                renewal.catch((error) => console.error("Error scheduling renewal:", error));
            }
            triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((achievement) => {
                if (achievement) broadcastAchievement(member.userId, achievement);
            }).catch((error) => console.error("Error triggering purchase:", error));
            return { ok: true, unsignedDocs };
        }
        case "failed":
            await db.update(transactions).set({
                status: "failed",
                paymentIntentId: charge.paymentIntentId,
                failedReason: charge.failureReason,
                failedCode: charge.failureCode,
                metadata: { ...metadata, ...charge.gatewayMetadata },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new CheckoutError(400, charge.failureReason);
        case "held":
        case "uncertain":
            await db.update(transactions).set({
                status: "pending",
                ...(charge.status === "held" && charge.paymentIntentId ? { paymentIntentId: charge.paymentIntentId } : {}),
                metadata: {
                    ...metadata,
                    ...charge.gatewayMetadata,
                    ...(charge.status === "held" ? { authorizeHeld: true } : { paymentUncertain: true }),
                },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new CheckoutError(202, charge.status === "held"
                ? "Payment is pending; do not retry"
                : "Payment status is unknown; do not retry");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
