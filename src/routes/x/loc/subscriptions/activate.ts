import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails, getAdditionalFeesForCheckout, getCurrency } from "@/utils";
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
import Stripe from "stripe";
import { BillingContextError, resolveSubscriptionBillingContext } from "./billingContext";
import type { SubscriptionBillingContext } from "./billingContext";
import { getNextBillingDate, type PromoDiscount, withTimeout } from "./shared";
import { getStripeMigration, getSubscriptionBillingQuote } from "@subtrees/utils/subscriptionBilling";
type GatewayService = "stripe" | "square";
type SquarePaymentResult = { id?: string; status?: string; receiptUrl?: string };

function squareLocationIdFromMetadata(metadata: unknown) {
    return typeof metadata === "object" && metadata !== null && "squareLocationId" in metadata
        ? String((metadata as { squareLocationId?: unknown }).squareLocationId || "")
        : "";
}

export async function activateSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/activate", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { paymentMethodId, paymentType } = body;

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
                billingItems: {
                    with: {
                        pricing: { with: { plan: true } },
                        participant: {
                            columns: {
                                parentId: true,
                                locationId: true,
                                memberPlanPricingId: true,
                            },
                        },
                    },
                },
                location: {
                    with: {
                        taxRates: true,
                        locationState: true,
                        integrations: {
                            columns: { id: true, accountId: true, service: true, accessToken: true, metadata: true },
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

        if (!sub || !sub.member || !sub.location || (!sub.pricing && !sub.billingItems?.length)) {
            return status(404, { error: "Subscription billing definition not found" });
        }
        if (sub.parentId) {
            return status(400, { error: "Only root subscriptions can be activated", code: "SUBSCRIPTION_CHILD" });
        }
        if (sub.paymentType === "cash") {
            return status(400, { error: "Use activate-cash for cash subscriptions" });
        }
        if (!paymentMethodId) {
            return status(400, { error: "paymentMethodId is required" });
        }

        let billingContext: SubscriptionBillingContext;
        try {
            billingContext = await resolveSubscriptionBillingContext(sub, {
                paymentMethodId,
                requirePaymentMethod: true,
            });
        } catch (error) {
            if (error instanceof BillingContextError) {
                const statusCode = error.code === "GATEWAY_NOT_FOUND" || error.code === "GATEWAY_NOT_CONFIGURED" ? 404 : 400;
                return status(statusCode, { error: error.message, code: error.code });
            }
            throw error;
        }
        const integration = billingContext.gateway;
        const gatewayService = integration.service as GatewayService;
        const squareLocationId = gatewayService === "square"
            ? squareLocationIdFromMetadata(integration.metadata)
            : "";
        if (gatewayService === "square" && !squareLocationId) {
            return status(400, { error: "Square location ID not found" });
        }
        const paymentMethod = {
            ok: true as const,
            value: {
                id: billingContext.paymentMethodId!,
                type: billingContext.paymentMethodType!,
            },
        };

        const nextBillingAt = getNextBillingDate(sub);
        const promoMeta = (sub.metadata?.promo as {
            id?: string;
            discount?: PromoDiscount;
            applied?: boolean;
        } | undefined);
        const discount = promoMeta?.discount
            ? {
                type: promoMeta.discount.type ?? "fixed_amount",
                value: promoMeta.discount.value ?? promoMeta.discount.amount,
            }
            : undefined;
        const location = sub.location;
        const currency = getCurrency(location.country);
        const billingQuote = getSubscriptionBillingQuote(sub);

        if (sub.status === "trialing" && sub.trialEnd && isFuture(sub.trialEnd)) {
            const payload = buildRenewalPayload({
                sub,
                lid,
                location,
                memberLocationGatewayCustomerId: billingContext.gatewayCustomerId,
                currency,
                taxRate: location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                promoMeta,
                billingQuote,
                expectedDueAt: gatewayService === "stripe" && getStripeMigration(sub.metadata) ? nextBillingAt : undefined,
            });

            await db.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethod.value.id,
                metadata: {
                    ...(sub.metadata || {}),
                    paymentMethodId: paymentMethod.value.id,
                    gatewayService,
                    gatewayIntegrationId: integration.id,
                    gatewayCustomerId: billingContext.gatewayCustomerId,
                },
            }).where(eq(memberSubscriptions.id, sub.id));

            await removeRenewalJobs(sub.id);
            if (["month", "year"].includes(billingQuote.interval) && billingQuote.intervalThreshold === 1) {
                await scheduleCronBasedRenewal({
                    startDate: nextBillingAt,
                    interval: billingQuote.interval as "month" | "year",
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
        // Defer first charge to future startDate
        if (isFuture(sub.startDate)) {
            const firstBillingAt = new Date(sub.startDate);
            const payload = buildRenewalPayload({
                sub,
                lid,
                location,
                memberLocationGatewayCustomerId: billingContext.gatewayCustomerId,
                currency,
                taxRate: sub.location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                promoMeta,
                billingQuote,
                expectedDueAt: gatewayService === "stripe" && getStripeMigration(sub.metadata) ? firstBillingAt : undefined,
            });

            await db.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethod.value.id,
                metadata: {
                    ...(sub.metadata || {}),
                    paymentMethodId: paymentMethod.value.id,
                    gatewayService,
                    gatewayIntegrationId: integration.id,
                    gatewayCustomerId: billingContext.gatewayCustomerId,
                },
            }).where(eq(memberSubscriptions.id, sub.id));

            await removeRenewalJobs(sub.id);

            if (["month", "year"].includes(billingQuote.interval) && billingQuote.intervalThreshold === 1) {
                await scheduleCronBasedRenewal({
                    startDate: firstBillingAt,
                    interval: billingQuote.interval as "month" | "year",
                    data: payload,
                });
            } else {
                await scheduleRecursiveRenewal({
                    startDate: firstBillingAt,
                    data: {
                        ...payload,
                        recurrenceCount: 1,
                    },
                });
            }

            return status(200, {
                status: "incomplete",
                nextBillingAt: firstBillingAt,
                scheduledJobKey: `renewal:${sub.id}`,
                message: "First charge scheduled for start date",
            });
        }

        const taxRate = sub.location.taxRates?.find((t) => t.isDefault) || sub.location.taxRates?.[0];
        const planName = sub.pricing?.plan?.name
            ? `${sub.pricing.plan.name}/${sub.pricing.name}`
            : billingQuote.name;
        const isDownpayment = !!sub.pricing?.downpayment && !sub.billingItems?.length;
        const billedAmount = isDownpayment ? sub.pricing!.downpayment! : billingQuote.price;
        const additionalFees = await getAdditionalFeesForCheckout(lid, "subscription");
        const chargeDetails = calculateChargeDetails({
            amount: billedAmount,
            discount: sub.billingItems?.length ? undefined : discount,
            taxRate: taxRate?.percentage ?? 0,
            planId: sub.location.locationState?.planId ?? 0,
            additionalFees,
        });
        const lineItems = sub.billingItems?.length
            ? [
                ...billingQuote.items.map((item) => ({
                    name: item.name,
                    description: "Subscription billing period",
                    quantity: item.quantity,
                    price: item.price,
                })),
                ...chargeDetails.additionalFeeLines,
            ]
            : [{
                name: planName,
                description: isDownpayment ? "Subscription downpayment" : "Subscription billing period",
                quantity: 1,
                price: chargeDetails.unitCost,
                discount: chargeDetails.productDiscount,
            }, ...chargeDetails.additionalFeeLines];

        const [invoice] = await db.insert(memberInvoices).values({
            memberId: sub.memberId,
            locationId: lid,
            memberPlanId: sub.id,
            description: isDownpayment
                ? `Downpayment for ${planName}`
                : `${billingQuote.name} - Billing Period`,
            items: lineItems,
            subTotal: chargeDetails.subTotal,
            total: chargeDetails.total,
            tax: chargeDetails.tax,
            currency: currency || "usd",
            status: "draft",
            dueDate: new Date(),
            paymentType: paymentMethod.value.type,
            invoiceType: "recurring",
            forPeriodStart: new Date(sub.currentPeriodStart),
            forPeriodEnd: new Date(sub.currentPeriodEnd),
            metadata: {
                type: "from-subscription",
                subscriptionId: sub.id,
                collectionMethod: "charge_automatically",
                gatewayService,
                gatewayIntegrationId: integration.id,
                gatewayCustomerId: billingContext.gatewayCustomerId,
                platformFeeAmount: chargeDetails.feesAmount,
            },
        }).returning({
            id: memberInvoices.id,
        });

        if (!invoice) {
            return status(500, { error: "Failed to create invoice for activation" });
        }

        const chargeDescription = isDownpayment
            ? `Downpayment for ${planName}`
            : `Payment for ${planName}`;
        let paymentIntentId: string;
        let squarePayment: SquarePaymentResult | undefined;

        try {
            if (chargeDetails.total === 0) {
                paymentIntentId = `free_${invoice.id}`;
            } else if (gatewayService === "stripe") {
                const stripe = new StripePaymentGateway(integration.accessToken!);
                const paymentResult = await withTimeout(
                    stripe.createChargeWithoutLineItems(billingContext.gatewayCustomerId, paymentMethod.value.id, {
                        total: chargeDetails.total,
                        feesAmount: chargeDetails.feesAmount,
                        description: chargeDescription,
                        metadata: {
                            lid,
                            locationId: lid,
                            memberId: sub.memberId,
                            invoiceId: invoice.id,
                            memberPlanId: sub.id,
                            memberSubscriptionId: sub.id,
                            gatewayService,
                        },
                        currency: currency || "usd",
                    }),
                    30000,
                    "Stripe payment timeout while activating subscription"
                );
                paymentIntentId = paymentResult.id;
            } else {
                const square = new SquarePaymentGateway(integration.accessToken!);
                squarePayment = await withTimeout(
                    square.createCharge(billingContext.gatewayCustomerId, paymentMethod.value.id, {
                        ...chargeDetails,
                        currency: currency || "USD",
                        referenceId: invoice.id,
                        squareLocationId,
                        note: `${chargeDescription}|invId:${invoice.id}|mid:${sub.memberId}|lid:${lid}|subId:${sub.id}`,
                    }),
                    30000,
                    "Square payment timeout while activating subscription"
                ) as SquarePaymentResult;

                if (!squarePayment?.id) {
                    throw new Error("Square payment was not created");
                }

                paymentIntentId = squarePayment.id;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to process payment";
            const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
            console.error("[x/subscriptions/activate] process payment failed", {
                lid,
                sid,
                memberId: sub.memberId,
                paymentMethodId,
                gatewayService,
                message,
                stripeType: stripeError?.type,
                stripeCode: stripeError?.code,
                stripeDeclineCode: stripeError?.decline_code,
                stripeParam: stripeError?.param,
                stripeRequestId: stripeError?.requestId,
                stripeStatusCode: stripeError?.statusCode,
            });
            if (!stripeError) return status(502, { error: message });
            return status(502, {
                error: message,
                code: stripeError.code || "STRIPE_ERROR",
                details: {
                    type: stripeError.type,
                    declineCode: stripeError.decline_code,
                    param: stripeError.param,
                    requestId: stripeError.requestId,
                    statusCode: stripeError.statusCode,
                },
            });
        }

        const finalizedImmediately = gatewayService === "square" || chargeDetails.total === 0;
        try {
            await db.transaction(async (tx) => {
                await tx.update(memberInvoices).set({
                    status: finalizedImmediately ? "paid" : "sent",
                    ...(finalizedImmediately ? { paid: true, receiptUrl: squarePayment?.receiptUrl ?? null } : {}),
                    sentAt: new Date(),
                    updated: new Date(),
                    metadata: {
                        type: "from-subscription",
                        subscriptionId: sub.id,
                        collectionMethod: "charge_automatically",
                        paymentIntentId,
                        gatewayService,
                        platformFeeAmount: chargeDetails.feesAmount,
                        ...(chargeDetails.total === 0 ? { noCharge: true } : {}),
                        ...(gatewayService === "square" ? {
                            paymentMethodId: paymentMethod.value.id,
                            squarePaymentId: squarePayment?.id,
                            chargeId: squarePayment?.id,
                            squarePaymentStatus: squarePayment?.status,
                        } : {}),
                    },
                }).where(eq(memberInvoices.id, invoice.id));

                await tx.update(memberSubscriptions).set({
                    gatewayPaymentId: paymentMethod.value.id,
                    ...(finalizedImmediately ? { status: "active" } : {}),
                    metadata: {
                        ...(sub.metadata || {}),
                        hasPaidDownpayment: isDownpayment,
                        paymentMethodId: paymentMethod.value.id,
                        gatewayService,
                        gatewayIntegrationId: integration.id,
                        gatewayCustomerId: billingContext.gatewayCustomerId,
                    ...(promoMeta && {
                        promo: {
                            ...promoMeta,
                            applied: true,
                        },
                    }),
                    },
                }).where(eq(memberSubscriptions.id, sub.id));

                if (finalizedImmediately) {
                    const txValues = {
                        memberId: sub.memberId,
                        locationId: lid,
                        description: chargeDescription,
                        type: "inbound" as const,
                        status: "paid" as const,
                        paymentType: paymentMethod.value.type,
                        paymentMethodId: paymentMethod.value.id,
                        paymentIntentId,
                        total: chargeDetails.total,
                        subTotal: chargeDetails.subTotal,
                        tax: chargeDetails.tax,
                        currency: currency || "usd",
                        feeAmount: chargeDetails.feesAmount,
                        metadata: {
                            memberPlanId: sub.id,
                            memberSubscriptionId: sub.id,
                            gatewayService,
                            ...(chargeDetails.total === 0 ? { noCharge: true } : {}),
                            squarePaymentId: squarePayment?.id,
                            chargeId: squarePayment?.id,
                            squarePaymentStatus: squarePayment?.status,
                        },
                        items: lineItems,
                        updated: new Date(),
                    };

                    const [transaction] = await tx.insert(transactions).values(txValues).returning({ id: transactions.id });
                    assert(transaction);
                    await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));

                    await tx.update(memberLocations).set({
                        status: "active",
                        updated: new Date(),
                    }).where(and(
                        eq(memberLocations.memberId, sub.memberId),
                        eq(memberLocations.locationId, lid)
                    ));
                }

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
                gatewayService,
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

        const payload = buildRenewalPayload({
            sub,
            lid,
            location: sub.location,
            memberLocationGatewayCustomerId: billingContext.gatewayCustomerId,
            currency,
            taxRate: taxRate?.percentage || 0,
            promoMeta,
            billingQuote,
            expectedDueAt: gatewayService === "stripe" && getStripeMigration(sub.metadata) ? nextBillingAt : undefined,
            discountAlreadyApplied: true,
        });

        try {
            await withTimeout(removeRenewalJobs(sub.id), 15000, "Redis timeout removing old renewal jobs");
            if (["month", "year"].includes(billingQuote.interval) && billingQuote.intervalThreshold === 1) {
                await withTimeout(
                    scheduleCronBasedRenewal({
                        startDate: nextBillingAt,
                        interval: billingQuote.interval as "month" | "year",
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
            status: gatewayService === "square" ? "active" : "processing",
            paymentIntentId,
            nextBillingAt,
            scheduledJobKey: `renewal:${sub.id}`,
        });
    }, {
        body: t.Object({
            paymentMethodId: t.Optional(t.String()),
            paymentType: t.Optional(t.Union([
                t.Literal("card"),
                t.Literal("us_bank_account"),
                t.Literal("link"),
                t.Literal("cashapp"),
            ])),
            confirmNow: t.Optional(t.Boolean()),
        }),
    });
}


function buildRenewalPayload({
    sub,
    lid,
    location,
    memberLocationGatewayCustomerId,
    currency,
    taxRate,
    promoMeta,
    billingQuote,
    expectedDueAt,
    discountAlreadyApplied = false,
}: {
    sub: NonNullable<Awaited<ReturnType<typeof db.query.memberSubscriptions.findFirst>>> & {
        member: { firstName: string; lastName: string | null; email: string };
        pricing?: { name: string; price: number; interval: string | null; intervalThreshold: number | null } | null;
    };
    lid: string;
    location: {
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
    };
    memberLocationGatewayCustomerId: string | null;
    currency: string;
    taxRate: number;
    promoMeta: { discount?: PromoDiscount } | undefined;
    billingQuote: { name: string; price: number; interval: "day" | "week" | "month" | "year"; intervalThreshold: number };
    expectedDueAt?: Date;
    discountAlreadyApplied?: boolean;
}): SubscriptionJobData {
    const remainingDiscountPayments = promoMeta?.discount
        ? Math.max(0, promoMeta.discount.duration - (discountAlreadyApplied ? 1 : 0))
        : 0;
    const renewalPricing = sub.pricing ?? billingQuote;
    return {
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
        taxRate,
        pricing: {
            name: renewalPricing.name,
            price: renewalPricing.price,
            interval: renewalPricing.interval as "day" | "week" | "month" | "year",
            intervalThreshold: renewalPricing.intervalThreshold!,
        },
        ...((expectedDueAt && getStripeMigration(sub.metadata)) ? { expectedDueAt: expectedDueAt.toISOString() } : {}),
        ...(promoMeta?.discount && remainingDiscountPayments > 0
            ? {
                discount: {
                    ...promoMeta.discount,
                    duration: remainingDiscountPayments,
                },
            }
            : {}),
    };
}
