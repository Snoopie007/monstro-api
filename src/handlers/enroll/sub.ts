import type { PaymentType } from "@subtrees/types";
import {
    calculateThresholdDate,
    calculateChargeDetails,
    triggerPurchase,
    fetchPromoDiscount,
    fetchEnrollContext,
} from "@/utils";
import {
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import { broadcastAchievement } from "@/libs/broadcast/achievements";
import { db } from "@/db/db";
import { memberContracts, memberInvoices, memberSubscriptions } from "@subtrees/schemas";
import { StripePaymentGateway, SquarePaymentGateway } from "@/libs/PaymentGateway";

export type EnrollSubInput = {
    lid: string;
    mid: string;
    priceId: string;
    paymentMethodId: string;
    paymentType: PaymentType;
    promoId?: string | null;
};

export async function handleEnrollSubscription(input: EnrollSubInput) {
    const { lid, mid, priceId, paymentMethodId, paymentType, promoId } = input;

    const {
        pricing,
        ml,
        gateway,
        taxRates,
        locationState,
        gatewayCustomerId,
    } = await fetchEnrollContext({ lid, mid, priceId });

    const { usagePercent, settings, currency } = locationState;

    if (!pricing.interval || !pricing.intervalThreshold || !pricing.plan) {
        throw new Error("Invalid pricing for subscription plan.");
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

    let unsignedDocs: string[] = [];
    const sub = await db.transaction(async (tx) => {
        const [s] = await tx.insert(memberSubscriptions).values({
            startDate: today,
            currentPeriodStart: today,
            currentPeriodEnd,
            locationId: lid,
            memberId: mid,
            cancelAt,
            classCredits,
            status: "incomplete",
            paymentType,
            memberPlanPricingId: pricing.id,
        }).returning();

        if (!s) {
            throw new Error("Failed to create subscription");
        }



        const [invoice] = await tx.insert(memberInvoices).values({
            description,
            items: [{
                name: productName,
                quantity: 1,
                price: chargeDetails.unitCost,
                discount,
            }],
            status: "draft",
            memberPlanId: s.id,
            memberId: mid,
            locationId: lid,
            ...chargeDetails,
            forPeriodStart: s.currentPeriodStart,
            forPeriodEnd: s.currentPeriodEnd,
            currency,
            dueDate: s.currentPeriodStart,
        }).returning({
            id: memberInvoices.id,
        });

        if (!invoice) {
            tx.rollback();
            throw new Error("Failed to create invoice");
        }

        if (gateway.service === "stripe") {
            try {
                const stripe = new StripePaymentGateway(gateway.accessToken);
                await stripe.createCharge(gatewayCustomerId, paymentMethodId, {
                    ...chargeDetails,
                    currency,
                    description,
                    productName,
                    metadata: {
                        memberPlanId: s.id,
                        invoiceId: invoice.id,
                        locationId: lid,
                        memberId: mid,
                    },
                });
            } catch (error) {
                console.error(error);
                tx.rollback();
                throw error;
            }
        }

        if (gateway.service === "square") {
            try {
                const square = new SquarePaymentGateway(gateway.accessToken);
                const squareLocationId = gateway.metadata?.squareLocationId;
                if (!squareLocationId) {
                    throw new Error("Square location ID not found");
                }
                await square.createCharge(gatewayCustomerId, paymentMethodId, {
                    ...chargeDetails,
                    currency,
                    referenceId: `${invoice.id}`,
                    squareLocationId,
                    note: `${description}|invId:${invoice.id}|mid:${mid}|lid:${lid}|subId:${s.id}|promoId:${promoId}`,
                });
            } catch (error) {
                console.error(error);
                tx.rollback();
                throw error;
            }
        }


        if (pricing.plan.contractId) {
            const [c] = await tx.insert(memberContracts).values({
                memberId: mid,
                templateId: pricing.plan.contractId,
                locationId: lid,
                memberPlanId: s.id,
            }).returning({
                id: memberContracts.id,
            });
            if (c) {
                unsignedDocs.push(c.id);
            }
        }

        if (locationState.waiverId && !ml.signedWaiverId) {
            const [w] = await tx.insert(memberContracts).values({
                memberId: mid,
                templateId: locationState.waiverId,
                locationId: lid,
                memberPlanId: s.id,
            }).returning({
                id: memberContracts.id,
            });
            if (w) {
                unsignedDocs.push(w.id);
            }
        }
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
