import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { calculateChargeDetails } from "@/utils";
import {
    removeRenewalJobs,
    scheduleCronBasedRenewal,
    scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import {
    memberInvoices,
    memberSubscriptions,
    promos,
} from "@subtrees/schemas";
import type { SubscriptionJobData } from "@subtrees/bullmq/types";
import { and, eq, sql } from "drizzle-orm";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { getNextBillingDate, resolveStripePaymentMethodForCustomer, type PromoDiscount, withTimeout } from "./shared";
import { getCurrency } from "@/utils";

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
                            columns: { accountId: true, service: true, accessToken: true },
                        },
                    },
                    columns: {
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        country: true,
                    },
                },
            },
        });

        if (!sub || !sub.pricing || !sub.member || !sub.location) {
            return status(404, { error: "Subscription not found" });
        }

        const memberLocation = await db.query.memberLocations.findFirst({
            where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, sub.memberId)),
            columns: {
                stripeCustomerId: true,
            },
        });

        if (!memberLocation) {
            return status(404, { error: "Member location not found" });
        }

        if (sub.paymentType !== "cash" && !memberLocation.stripeCustomerId) {
            return status(400, { error: "Member location is missing Stripe customer" });
        }

        if (sub.paymentType === "cash") {
            return status(400, { error: "Use activate-cash for cash subscriptions" });
        }

        const integration = sub.location.integrations?.[0];
        if (!integration || !integration.accountId || !integration.accessToken) {
            return status(404, { error: "Stripe integration not found" });
        }

        const nextBillingAt = getNextBillingDate(sub);

        const promoMeta = (sub.metadata?.promo as {
            id?: string;
            discount?: PromoDiscount;
            applied?: boolean;
        } | undefined);
        const discountAmount = promoMeta?.discount?.amount || 0;

        const location = sub.location;
        if (!location) {
            return status(404, { error: "Location not found" });
        }
        const currency = getCurrency(location.country);

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
                    name: location.name,
                    email: location.email,
                    phone: location.phone,
                    address: location.address,
                },
                taxRate: location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                stripeCustomerId: memberLocation.stripeCustomerId || null,
                pricing: {
                    name: sub.pricing.name,
                    price: sub.pricing.price,
                    currency: currency || "usd",
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

        const stripe = new MemberStripePayments(integration.accountId, integration.accessToken);
        stripe.setCustomer(memberLocation.stripeCustomerId!);

        const resolvedPaymentMethod = await resolveStripePaymentMethodForCustomer({
            stripe,
            stripeCustomerId: memberLocation.stripeCustomerId!,
            paymentMethodId,
            invalidMessage: "Selected payment method is not available for this member",
            unsupportedMessage: "Unsupported payment method type for activation",
            upstreamMessage: "Failed to validate payment method with Stripe",
            logLabel: "[x/subscriptions/activate] payment method validation failed",
            logContext: { lid, sid, memberId: sub.memberId, paymentMethodId },
        });

        if (!resolvedPaymentMethod.ok) {
            return status(resolvedPaymentMethod.statusCode, { error: resolvedPaymentMethod.error });
        }

        const paymentMethod = resolvedPaymentMethod.paymentMethod;

        const taxRate = sub.location.taxRates?.find((t) => t.isDefault) || sub.location.taxRates?.[0];
        const planName = `${sub.pricing.plan?.name || "Plan"}/${sub.pricing.name}`;
        const billedAmount = sub.pricing.downpayment || sub.pricing.price;
        const locationState = sub.location?.locationState;
        const isGrowthPlan = locationState?.planId === 3;
        const chargeDetails = calculateChargeDetails({
            amount: billedAmount,
            discount: discountAmount,
            taxRate: taxRate?.percentage ?? 0,
            usagePercent: sub.location.locationState?.usagePercent ?? 0,
            paymentType: paymentMethod.type,
            isRecurring: isGrowthPlan ? false : !sub.pricing.downpayment,
            passOnFees: sub.location.locationState?.settings?.passOnFees ?? false,
        });

        const lineItems = [{
            name: planName,
            description: sub.pricing.downpayment ? "Subscription downpayment" : "Subscription billing period",
            quantity: 1,
            price: billedAmount,
            discount: discountAmount,
        }];

        const [invoice] = await db.insert(memberInvoices).values({
            memberId: sub.memberId,
            locationId: lid,
            memberPlanId: sub.id,
            description: sub.pricing.downpayment
                ? `Downpayment for ${planName}`
                : `${sub.pricing.name} - Billing Period`,
            items: lineItems,
            subTotal: chargeDetails.subTotal,
            total: chargeDetails.total,
            tax: chargeDetails.tax,
            currency: currency || "usd",
            status: "draft",
            dueDate: new Date(),
            paymentType: paymentMethod.type,
            invoiceType: "recurring",
            forPeriodStart: new Date(sub.currentPeriodStart),
            forPeriodEnd: new Date(sub.currentPeriodEnd),
            metadata: {
                type: "from-subscription",
                subscriptionId: sub.id,
                collectionMethod: "charge_automatically",
            },
        }).returning({
            id: memberInvoices.id,
        });

        if (!invoice) {
            return status(500, { error: "Failed to create invoice for activation" });
        }

        let paymentIntentId: string;

        try {
            const paymentResult = await withTimeout(
                stripe.processPayment({
                    ...chargeDetails,
                    description: sub.pricing.downpayment
                        ? `Downpayment for ${planName}`
                        : `Payment for ${planName}`,
                    paymentMethodId: paymentMethod.id,
                    metadata: {
                        lid,
                        locationId: lid,
                        memberId: sub.memberId,
                        invoiceId: invoice.id,
                        memberPlanId: sub.id,
                        memberSubscriptionId: sub.id,
                    },
                    productName: planName,
                    currency: currency || "usd",
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
                await tx.update(memberInvoices).set({
                    status: "sent",
                    sentAt: new Date(),
                    updated: new Date(),
                    metadata: {
                        type: "from-subscription",
                        subscriptionId: sub.id,
                        collectionMethod: "charge_automatically",
                        paymentIntentId,
                    },
                }).where(eq(memberInvoices.id, invoice.id));

                await tx.update(memberSubscriptions).set({
                    stripePaymentId: paymentMethod.id,
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

                if (promoMeta?.id && !promoMeta.applied) {
                    await tx.update(promos).set({
                        redemptionCount: sql`${promos.redemptionCount} + 1`,
                        updated: new Date(),
                    }).where(eq(promos.id, promoMeta.id));
                }
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to persist activation metadata";
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
                error: "Activation payment succeeded but post-payment update failed",
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
            stripeCustomerId: memberLocation.stripeCustomerId || null,
            pricing: {
                name: sub.pricing.name,
                price: sub.pricing.price,
                currency: currency || "usd",
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
            status: "processing",
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
