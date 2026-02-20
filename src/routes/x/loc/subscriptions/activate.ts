import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { calculateChargeDetails } from "@/libs/utils";
import {
    removeRenewalJobs,
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import {
    memberInvoices,
    memberLocations,
    memberSubscriptions,
    promos,
    transactions,
} from "@subtrees/schemas";
import type { SubscriptionJobData } from "@subtrees/bullmq/types";
import { and, eq, sql } from "drizzle-orm";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { getNextBillingDate, type PromoDiscount, withTimeout } from "./shared";

export async function activateSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/activate", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { paymentMethodId } = body;

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                member: {
                    columns: {
                        id: true,
                        stripeCustomerId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                pricing: {
                    with: {
                        plan: true,
                    },
                },
                location: {
                    with: {
                        taxRates: true,
                        locationState: true,
                        integrations: {
                            where: (integration, { eq }) => eq(integration.service, "stripe"),
                            columns: { accountId: true, service: true },
                        },
                    },
                },
            },
        });

        if (!sub || !sub.pricing || !sub.member || !sub.location) {
            return status(404, { error: "Subscription not found" });
        }

        if (!sub.member.stripeCustomerId) {
            return status(400, { error: "Member is missing Stripe customer" });
        }

        if (sub.paymentType === "cash") {
            return status(400, { error: "Use activate-cash for cash subscriptions" });
        }

        const integration = sub.location.integrations?.[0];
        if (!integration?.accountId) {
            return status(404, { error: "Stripe integration not found" });
        }

        const nextBillingAt = getNextBillingDate(sub);

        const promoMeta = (sub.metadata?.promo as {
            id?: string;
            discount?: PromoDiscount;
            applied?: boolean;
        } | undefined);
        const discountAmount = promoMeta?.discount?.amount || 0;

        if (sub.status === "trialing" && sub.trialEnd && isFuture(sub.trialEnd)) {
            const payload: SubscriptionJobData = {
                sid: sub.id,
                lid,
                member: {
                    firstName: sub.member.firstName,
                    lastName: sub.member.lastName,
                    email: sub.member.email,
                },
                location: {
                    name: sub.location.name,
                    email: sub.location.email,
                    phone: sub.location.phone,
                    address: sub.location.address,
                },
                taxRate: sub.location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                stripeCustomerId: sub.member.stripeCustomerId,
                pricing: {
                    name: sub.pricing.name,
                    price: sub.pricing.price,
                    currency: sub.pricing.currency,
                    interval: sub.pricing.interval!,
                    intervalThreshold: sub.pricing.intervalThreshold!,
                },
                ...(promoMeta?.discount ? { discount: promoMeta.discount } : {}),
            };

            await removeRenewalJobs(sub.id);
            if (["month", "year"].includes(sub.pricing.interval || "") && sub.pricing.intervalThreshold === 1) {
                await scheduleCronBasedRenewal({
                    startDate: nextBillingAt,
                    interval: sub.pricing.interval as "month" | "year",
                    data: payload,
                });
            } else {
                await scheduleRecursiveRenewal({
                    startDate: nextBillingAt,
                    data: {
                        ...payload,
                        recurrenceCount: 1,
                    },
                });
            }

            return status(200, {
                status: "trialing",
                nextBillingAt,
                scheduledJobKey: `renewal:${sub.id}`,
            });
        }

        if (!paymentMethodId) {
            return status(400, { error: "paymentMethodId is required" });
        }

        const paymentMethod = await db.query.paymentMethods.findFirst({
            where: (pm, { and, eq }) => and(eq(pm.id, paymentMethodId), eq(pm.memberId, sub.memberId)),
            columns: {
                id: true,
                stripeId: true,
                type: true,
            },
        });

        if (!paymentMethod) {
            return status(404, { error: "Payment method not found" });
        }

        if (paymentMethod.type !== "card" && paymentMethod.type !== "us_bank_account") {
            return status(400, { error: "Unsupported payment method type for activation" });
        }

        const stripe = new MemberStripePayments(integration.accountId);
        stripe.setCustomer(sub.member.stripeCustomerId);

        const taxRate = sub.location.taxRates?.find((t) => t.isDefault) || sub.location.taxRates?.[0];
        const planName = `${sub.pricing.plan?.name || "Plan"}/${sub.pricing.name}`;
        const billedAmount = sub.pricing.downpayment || sub.pricing.price;
        const chargeDetails = calculateChargeDetails({
            amount: billedAmount,
            discount: discountAmount,
            taxRate: taxRate?.percentage ?? 0,
            usagePercent: sub.location.locationState?.usagePercent ?? 0,
            paymentType: paymentMethod.type,
            isRecurring: !sub.pricing.downpayment,
            passOnFees: sub.location.locationState?.settings?.passOnFees ?? false,
        });

        let paymentIntentId: string;

        try {
            const paymentResult = await withTimeout(
                stripe.processPayment({
                    ...chargeDetails,
                    description: sub.pricing.downpayment
                        ? `Downpayment for ${planName}`
                        : `Payment for ${planName}`,
                    paymentMethodId: paymentMethod.stripeId,
                    metadata: {
                        lid,
                        locationId: lid,
                        memberId: sub.memberId,
                        memberSubscriptionId: sub.id,
                    },
                    productName: planName,
                    currency: sub.pricing.plan?.currency || sub.pricing.currency,
                }),
                30000,
                "Stripe payment timeout while activating subscription"
            );
            paymentIntentId = paymentResult.id;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to process payment";
            console.error("[x/subscriptions/activate] stripe process payment failed", {
                lid,
                sid,
                memberId: sub.memberId,
                paymentMethodId,
                message,
            });
            return status(502, { error: message });
        }

        try {
            await db.transaction(async (tx) => {
            const lineItems = [{
                name: planName,
                description: sub.pricing.downpayment ? "Subscription downpayment" : "Subscription billing period",
                quantity: 1,
                price: billedAmount,
            }];

            const [invoice] = await tx.insert(memberInvoices).values({
                memberId: sub.memberId,
                locationId: lid,
                memberSubscriptionId: sub.id,
                description: sub.pricing.downpayment
                    ? `Downpayment for ${planName}`
                    : `${sub.pricing.name} - Billing Period`,
                items: lineItems,
                subTotal: chargeDetails.subTotal,
                total: chargeDetails.total,
                tax: chargeDetails.tax,
                discount: discountAmount,
                currency: sub.pricing.currency,
                status: "paid",
                paid: true,
                sentAt: new Date(),
                dueDate: new Date(),
                paymentType: paymentMethod.type,
                invoiceType: "recurring",
                forPeriodStart: new Date(sub.currentPeriodStart),
                forPeriodEnd: new Date(sub.currentPeriodEnd),
                metadata: {
                    type: "from-subscription",
                    subscriptionId: sub.id,
                    collectionMethod: "charge_automatically",
                    paymentIntentId,
                },
            }).returning();

            await tx.update(memberSubscriptions).set({
                status: "active",
                stripePaymentId: paymentMethod.stripeId,
                metadata: {
                    ...(sub.metadata || {}),
                    hasPaidDownpayment: !!sub.pricing.downpayment,
                    ...(promoMeta && {
                        promo: {
                            ...promoMeta,
                            applied: true,
                        },
                    }),
                },
            }).where(eq(memberSubscriptions.id, sub.id));

            await tx.insert(transactions).values({
                description: `Payment for ${planName}`,
                items: [{ name: planName, quantity: 1, price: billedAmount, discount: discountAmount }],
                type: "inbound",
                total: chargeDetails.total,
                subTotal: chargeDetails.subTotal,
                tax: chargeDetails.tax,
                fees: {
                    stripeFee: chargeDetails.stripeFee,
                    monstroFee: chargeDetails.monstroFee,
                },
                status: "paid",
                locationId: lid,
                memberId: sub.memberId,
                invoiceId: invoice?.id,
                paymentType: paymentMethod.type,
                paymentMethodId: paymentMethod.stripeId,
                paymentIntentId,
                chargeDate: new Date(),
                currency: sub.pricing.currency,
                metadata: {
                    memberSubscriptionId: sub.id,
                    paymentIntentId,
                },
            });

            await tx.update(memberLocations).set({
                status: "active",
                updated: new Date(),
            }).where(and(eq(memberLocations.memberId, sub.memberId), eq(memberLocations.locationId, lid)));

            if (promoMeta?.id && !promoMeta.applied) {
                await tx.update(promos).set({
                    redemptionCount: sql`${promos.redemptionCount} + 1`,
                    updated: new Date(),
                }).where(eq(promos.id, promoMeta.id));
            }
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to persist activation records";
            console.error("[x/subscriptions/activate] db transaction failed after payment", {
                lid,
                sid,
                memberId: sub.memberId,
                paymentMethodId,
                paymentIntentId,
                message,
                stack: error instanceof Error ? error.stack : undefined,
                error,
            });

            return status(500, {
                error: "Activation payment succeeded but database update failed",
                code: "ACTIVATION_DB_WRITE_FAILED",
                details: { message, paymentIntentId },
            });
        }

        const payload: SubscriptionJobData = {
            sid: sub.id,
            lid,
            member: {
                firstName: sub.member.firstName,
                lastName: sub.member.lastName,
                email: sub.member.email,
            },
            location: {
                name: sub.location.name,
                email: sub.location.email,
                phone: sub.location.phone,
                address: sub.location.address,
            },
            taxRate: taxRate?.percentage || 0,
            stripeCustomerId: sub.member.stripeCustomerId,
            pricing: {
                name: sub.pricing.name,
                price: sub.pricing.price,
                currency: sub.pricing.currency,
                interval: sub.pricing.interval!,
                intervalThreshold: sub.pricing.intervalThreshold!,
            },
            ...(promoMeta?.discount ? { discount: promoMeta.discount } : {}),
        };

        try {
            await withTimeout(removeRenewalJobs(sub.id), 15000, "Redis timeout removing old renewal jobs");
            if (["month", "year"].includes(sub.pricing.interval || "") && sub.pricing.intervalThreshold === 1) {
                await withTimeout(
                    scheduleCronBasedRenewal({
                        startDate: nextBillingAt,
                        interval: sub.pricing.interval as "month" | "year",
                        data: payload,
                    }),
                    15000,
                    "Redis timeout scheduling cron renewal"
                );
            } else {
                await withTimeout(
                    scheduleRecursiveRenewal({
                        startDate: nextBillingAt,
                        data: {
                            ...payload,
                            recurrenceCount: 1,
                        },
                    }),
                    15000,
                    "Redis timeout scheduling recursive renewal"
                );
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to schedule renewal";
            console.error("[x/subscriptions/activate] scheduling failed", {
                lid,
                sid,
                message,
            });
            return status(502, {
                error: "Payment completed but renewal scheduling failed",
                code: "SCHEDULER_FAILURE",
                details: { message },
            });
        }

        return status(200, {
            status: "active",
            paymentIntentId,
            nextBillingAt,
            scheduledJobKey: `renewal:${sub.id}`,
        });
    }, {
        body: t.Object({
            paymentMethodId: t.Optional(t.String()),
            confirmNow: t.Optional(t.Boolean()),
        }),
    });
}
