import { addDays } from "date-fns";
import type { PaymentType } from "@subtrees/types";
import {
    authorizeReferenceIdForTransaction,
    calculateThresholdDate,
    calculateChargeDetails,
    chargeWithGateway,
    CheckoutError,
    createEnrollUnsignedDocs,
    recoverEnrollUnsignedDocs,
    triggerPurchase,
    fetchPromoDiscount,
    getAdditionalFeesForCheckout,
    getCheckoutContext,
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
import { memberContracts, memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";

export type EnrollSubProps = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
    attemptId: string;
    startDate?: string;
    endDate?: string;
    trialDays?: number;
    allowProration?: boolean;
    quoteOnly?: boolean;
};

export async function handleEnrollSubscription(props: EnrollSubProps) {
    const {
        lid,
        mid,
        priceId,
        paymentMethodId,
        paymentType,
        promoId,
        attemptId,
        startDate,
        endDate,
        trialDays,
        allowProration,
        quoteOnly = false,
    } = props;
    const transactionId = stableCheckoutTransactionId("subscription", lid, mid, attemptId);
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
        if (!invoice) throw new CheckoutError(202, "Payment is paid and subscription is being finalized");
        if (!invoice.memberPlanId) {
            throw new CheckoutError(202, "Payment is paid and subscription is being finalized");
        }

        const [checkout, pricing] = await Promise.all([
            getCheckoutContext({ lid, mid }),
            db.query.memberPlanPricing.findFirst({
                where: (row, { eq }) => eq(row.id, priceId),
                with: { plan: true },
            }),
        ]);
        if (
            !pricing?.plan ||
            pricing.plan.locationId !== lid ||
            pricing.plan.archived ||
            pricing.plan.type !== "recurring"
        ) {
            throw new CheckoutError(404, "Pricing not found");
        }
        const waiverId = checkout.ml.location.locationState.waiverId;
        let recoverWaiverId = waiverId;
        if (checkout.ml.signedWaiverId && waiverId) {
            const signedWaiver = await db.query.memberContracts.findFirst({
                where: (memberContract, { eq, and, isNotNull }) => and(
                    eq(memberContract.id, checkout.ml.signedWaiverId!),
                    eq(memberContract.memberId, mid),
                    eq(memberContract.locationId, lid),
                    eq(memberContract.templateId, waiverId),
                    isNotNull(memberContract.signedOn),
                ),
                with: {
                    contractTemplate: {
                        columns: { locationId: true },
                    },
                },
            });
            if (signedWaiver?.contractTemplate?.locationId === lid) {
                recoverWaiverId = null;
            }
        }
        const templateIds = [
            pricing.plan.contractId,
            checkout.ml.location.locationState.waiverId,
        ].filter((id): id is string => Boolean(id));
        if (templateIds.length > 0) {
            const templates = await Promise.all(templateIds.map((templateId) =>
                db.query.contractTemplates.findFirst({
                    where: (template, { eq, and }) => and(
                        eq(template.id, templateId),
                        eq(template.locationId, lid),
                    ),
                    columns: { id: true },
                }),
            ));
            if (templates.some((template) => !template)) {
                throw new CheckoutError(404, "Contract not found");
            }
        }
        return {
            ok: true,
            unsignedDocs: await recoverEnrollUnsignedDocs({
                mid,
                lid,
                memberPlanId: invoice.memberPlanId,
                contractId: pricing.plan.contractId,
                waiverId: recoverWaiverId,
            }),
        };
    }

    const [checkout, pricing] = await Promise.all([
        getCheckoutContext({ lid, mid }),
        db.query.memberPlanPricing.findFirst({
            where: (row, { eq }) => eq(row.id, priceId),
            with: { plan: true },
        }),
    ]);
    if (
        !pricing?.plan ||
        pricing.plan.locationId !== lid ||
        pricing.plan.archived ||
        pricing.plan.type !== "recurring"
    ) {
        throw new CheckoutError(404, "Pricing not found");
    }
    if (!pricing.interval || !pricing.intervalThreshold) {
        throw new CheckoutError(400, "Invalid pricing for subscription plan.");
    }

    const { ml, gateway, taxRates, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const contractId = pricing.plan.contractId;
    const waiverId = locationState.waiverId;
    const templateIds = [contractId, waiverId].filter((id): id is string => Boolean(id));
    if (templateIds.length > 0) {
        const templates = await Promise.all(templateIds.map((templateId) =>
            db.query.contractTemplates.findFirst({
                where: (template, { eq, and }) => and(
                    eq(template.id, templateId),
                    eq(template.locationId, lid),
                ),
                columns: { id: true },
            }),
        ));
        if (templates.some((template) => !template)) {
            throw new CheckoutError(404, "Contract not found");
        }
    }

    const { usagePercent, currency } = locationState;
    const signedWaiverId = ml.signedWaiverId;
    if (signedWaiverId) {
        if (!waiverId) {
            throw new CheckoutError(404, "Contract not found");
        }
        const signedWaiver = await db.query.memberContracts.findFirst({
            where: (memberContract, { eq, and, isNotNull }) => and(
                eq(memberContract.id, signedWaiverId),
                eq(memberContract.memberId, mid),
                eq(memberContract.locationId, lid),
                eq(memberContract.templateId, waiverId),
                isNotNull(memberContract.signedOn),
            ),
            with: {
                contractTemplate: {
                    columns: {
                        locationId: true,
                    },
                },
            },
        });
        if (!signedWaiver || signedWaiver.contractTemplate?.locationId !== lid) {
            throw new CheckoutError(404, "Contract not found");
        }
    }
    const today = new Date();
    const subscriptionStart = startDate ? new Date(startDate) : today;
    if (Number.isNaN(subscriptionStart.getTime())) {
        throw new CheckoutError(400, "Invalid subscription start date");
    }
    const currentPeriodEnd = calculateThresholdDate({
        startDate: subscriptionStart,
        threshold: pricing.intervalThreshold,
        interval: pricing.interval,
    });
    const cancelAt = endDate
        ? new Date(endDate)
        : pricing.expireThreshold && pricing.expireInterval
            ? calculateThresholdDate({
                startDate: subscriptionStart,
                threshold: pricing.expireThreshold,
                interval: pricing.expireInterval,
            })
            : undefined;
    if (cancelAt && (Number.isNaN(cancelAt.getTime()) || cancelAt <= subscriptionStart)) {
        throw new CheckoutError(400, "Invalid subscription end date");
    }
    const parsedTrialDays = typeof trialDays === "number" && trialDays > 0 ? trialDays : 0;
    const trialEnd = parsedTrialDays > 0 ? addDays(subscriptionStart, parsedTrialDays) : undefined;
    const resolvedAllowProration = allowProration ?? pricing.plan.allowProration ?? false;
    const classCredits = pricing.plan.classLimitInterval === "term"
        ? pricing.plan.totalClassLimit || 0
        : 0;
    const taxRate = taxRates.find((rate) => rate.isDefault) || taxRates[0];
    const discount = await fetchPromoDiscount(promoId ?? undefined, pricing, lid);
    const additionalFees = await getAdditionalFeesForCheckout(lid, "subscription");
    const chargeDetails = calculateChargeDetails({
        amount: pricing.downpayment || pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        usagePercent: usagePercent || 0,
        additionalFees,
    });
    if (quoteOnly) {
        const baseAmount = pricing.downpayment || pricing.price;
        return {
            baseAmount,
            discount,
            tax: chargeDetails.tax,
            fees: chargeDetails.additionalFeeTotal,
            additionalFeeLines: chargeDetails.additionalFeeLines,
            total: chargeDetails.total,
            currency,
        };
    }
    const productName = pricing.name;
    const description = `${pricing.downpayment ? "Downpayment" : "Payment"} for ${pricing.name}`;
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
            authorizeCustomerProfileId: gatewayCustomerId,
            authorizeReferenceId,
        } : {}),
        gatewayService: gateway.service,
        checkoutKind: "subscription",
        checkoutAttemptId: attemptId,
        memberPlanPricingId: pricing.id,
        productName,
        discount,
        subscriptionStartAt: subscriptionStart.toISOString(),
        subscriptionCurrentPeriodEnd: currentPeriodEnd.toISOString(),
        ...(cancelAt ? { subscriptionCancelAt: cancelAt.toISOString() } : {}),
        ...(trialEnd ? { subscriptionTrialEnd: trialEnd.toISOString() } : {}),
        subscriptionAllowProration: resolvedAllowProration,
        classCredits,
    };
    const items = [{
        name: productName,
        quantity: 1,
        price: chargeDetails.unitCost,
        discount,
    }, ...chargeDetails.additionalFeeLines];
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
            const subscription = await db.transaction(async (tx) => {
                const [created] = await tx.insert(transactions).values({
                    id: transactionId,
                    total: chargeDetails.total,
                    subTotal: chargeDetails.subTotal,
                    tax: chargeDetails.tax,
                    feeAmount: chargeDetails.feesAmount,
                    items,
                    description,
                    currency,
                    locationId: lid,
                    memberId: mid,
                    type: "inbound",
                    status: "paid",
                    paymentMethodId,
                    paymentType,
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

                const [result] = await tx.insert(memberSubscriptions).values({
                    startDate: subscriptionStart,
                    currentPeriodStart: subscriptionStart,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,
                    cancelAt,
                    trialEnd,
                    classCredits,
                    status: "active",
                    paymentType,
                    gatewayPaymentId: paymentMethodId,
                    metadata: {
                        gatewayIntegrationId: gateway.integrationId,
                        gatewayCustomerId,
                        allowProration: resolvedAllowProration,
                    },
                    memberPlanPricingId: pricing.id,
                }).returning();
                if (!result) throw new Error("Failed to create subscription");

                const [invoice] = await tx.insert(memberInvoices).values({
                    description,
                    items,
                    status: "paid",
                    paid: true,
                    memberPlanId: result.id,
                    memberId: mid,
                    locationId: lid,
                    paymentType,
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
                    contractId,
                    waiverId,
                    signedWaiverId,
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
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                total: chargeDetails.total,
                subTotal: chargeDetails.subTotal,
                tax: chargeDetails.tax,
                feeAmount: chargeDetails.feesAmount,
                items,
                description,
                currency,
                locationId: lid,
                memberId: mid,
                type: "inbound",
                status: "failed",
                paymentMethodId,
                paymentType,
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
