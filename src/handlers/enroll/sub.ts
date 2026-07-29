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
import type { TransactionActivity } from "@subtrees/types";

export type EnrollSubProps = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
};

export async function handleEnrollSubscription(props: EnrollSubProps) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId } = props;

    const [checkout, pricing] = await Promise.all([
        getCheckoutContext({ lid, mid }),
        db.query.memberPlanPricing.findFirst({
            where: (row, { eq }) => eq(row.id, priceId),
            with: { plan: true },
        }),
    ]);

    if (!pricing?.plan) {
        throw new CheckoutError(404, "Pricing not found");
    }

    const { ml, gateway, taxRates, gatewayCustomerId } = checkout;
    const locationState = ml.location.locationState;
    const { usagePercent, settings, currency } = locationState;

    if (!pricing.interval || !pricing.intervalThreshold) {
        throw new CheckoutError(400, "Invalid pricing for subscription plan.");
    }

    const today = new Date();
    const currentPeriodEnd = calculateThresholdDate({
        startDate: today,
        threshold: pricing.intervalThreshold,
        interval: pricing.interval,
    });

    let cancelAt: Date | undefined;
    if (pricing.expireThreshold && pricing.expireInterval) {
        cancelAt = calculateThresholdDate({
            startDate: today,
            threshold: pricing.expireThreshold,
            interval: pricing.expireInterval,
        });
    }

    const classCredits = pricing.plan.classLimitInterval === "term"
        ? pricing.plan.totalClassLimit || 0
        : 0;

    const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];
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


    let chargeResult: ChargeWithGatewayResult | undefined;

    try {

        const note = `mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`;

        chargeResult = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            paymentType,
            total: chargeDetails.total,
            feesAmount: chargeDetails.feesAmount,
            currency,
            description,
            note,
            metadata: {
                locationId: lid,
                memberId: mid,
            },
        });
    } catch (error) {
        console.error(error);
        throw error;
    }

    let unsignedDocs: string[] = [];
    if (!chargeResult) {
        throw new Error("Failed to charge");
    }

    const sub = await db.transaction(async (tx) => {
        const [s] = await tx.insert(memberSubscriptions).values({
            startDate: today,
            currentPeriodStart: today,
            currentPeriodEnd,
            locationId: lid,
            memberId: mid,
            cancelAt,
            classCredits,
            status: "active",
            paymentType,
            memberPlanPricingId: pricing.id,
        }).returning();

        if (!s) {
            throw new Error("Failed to create subscription");
        }

        const [transaction] = await tx.insert(transactions).values({
            ...chargeDetails,
            description,
            currency,
            locationId: lid,
            memberId: mid,
            type: "inbound",
            status: "paid",
            chargeDate: today,
            paymentMethodId,
            paymentType,
            activities: [{
                at: today.toISOString(),
                reason: "Payment succeeded",
                paymentType,
                brand: chargeResult.brand,
                last4: chargeResult.last4,
            }],
        }).returning({ id: transactions.id });
        if (!transaction) {
            tx.rollback();
            throw new Error("Failed to create transaction");
        }

        const [invoice] = await tx.insert(memberInvoices).values({
            description,
            items: [{
                name: productName,
                quantity: 1,
                price: chargeDetails.unitCost,
                discount,
            }],
            status: "paid",
            memberPlanId: s.id,
            memberId: mid,
            locationId: lid,
            ...chargeDetails,
            forPeriodStart: s.currentPeriodStart,
            forPeriodEnd: s.currentPeriodEnd,
            currency,
            dueDate: s.currentPeriodStart,
            transactionId: transaction.id,
        }).returning({
            id: memberInvoices.id,
        });

        if (!invoice) {
            tx.rollback();
            throw new Error("Failed to create invoice");
        }



        unsignedDocs = await createEnrollUnsignedDocs(tx, {
            mid,
            lid,
            memberPlanId: s.id,
            contractId: pricing.plan.contractId,
            waiverId: locationState.waiverId,
            signedWaiverId: ml.signedWaiverId,
        });
        return s;
    });

    const member = ml.member;
    if (pricing.interval && pricing.intervalThreshold) {
        const nextBillingDate = new Date(sub.currentPeriodEnd);
        if (["month", "year"].includes(pricing.interval)) {
            const payload: SubscriptionJobData = {
                sid: sub.id,
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

            if (pricing.intervalThreshold === 1) {
                scheduleCronBasedRenewal({
                    startDate: nextBillingDate,
                    interval: pricing.interval,
                    data: payload,
                }).catch((err) => {
                    console.error("Error scheduling cron renewal:", err);
                });
            } else {
                scheduleRecursiveRenewal({
                    startDate: nextBillingDate,
                    data: {
                        ...payload,
                        recurrenceCount: 1,
                    },
                }).catch((err) => {
                    console.error("Error scheduling recursive renewal:", err);
                });
            }
        }
    }

    triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((a) => {
        if (a) {
            broadcastAchievement(member.userId, a);
        }
    });

    return { ok: true, unsignedDocs };
}
