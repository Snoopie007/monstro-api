import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails, getCurrency } from "@/utils";
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

type GatewayService = "stripe" | "square";
type SubscriptionPaymentMethod = { id: string; type: "card" | "us_bank_account" };
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

        if (!sub || !sub.pricing || !sub.member || !sub.location) {
            return status(404, { error: "Subscription not found" });
        }

        const memberLocation = await db.query.memberLocations.findFirst({
            where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, sub.memberId)),
            columns: {
                gatewayCustomerId: true,
            },
        });

        if (!memberLocation) {
            return status(404, { error: "Member location not found" });
        }

        if (sub.paymentType !== "cash" && !memberLocation.gatewayCustomerId) {
            return status(400, { error: "Member location is missing gateway customer" });
        }

        if (sub.paymentType === "cash") {
            return status(400, { error: "Use activate-cash for cash subscriptions" });
        }

        const integration = sub.location.integrations?.find((candidate) => {
            return candidate.id === sub.location?.locationState?.paymentGatewayId;
        }) ?? sub.location.integrations?.[0];

        if (!integration || !integration.accessToken) {
            return status(404, { error: "Payment gateway integration not found" });
        }

        if (integration.service !== "stripe" && integration.service !== "square") {
            return status(400, { error: "Unsupported payment gateway for subscriptions" });
        }

        if (integration.service === "stripe" && !integration.accountId) {
            return status(404, { error: "Stripe integration not found" });
        }

        if (!paymentMethodId) {
            return status(400, { error: "paymentMethodId is required" });
        }

        const gatewayService = integration.service as GatewayService;
        const squareLocationId = gatewayService === "square"
            ? squareLocationIdFromMetadata(integration.metadata)
            : "";

        if (gatewayService === "square" && !squareLocationId) {
            return status(400, { error: "Square location ID not found" });
        }

        const paymentMethod = await resolvePaymentMethod({
            gatewayService,
            accessToken: integration.accessToken,
            gatewayCustomerId: memberLocation.gatewayCustomerId!,
            paymentMethodId,
            paymentType,
        });

        if (!paymentMethod.ok) return status(paymentMethod.statusCode, { error: paymentMethod.error });

        const nextBillingAt = getNextBillingDate(sub);
        const promoMeta = (sub.metadata?.promo as {
            id?: string;
            discount?: PromoDiscount;
            applied?: boolean;
        } | undefined);
        const discountAmount = promoMeta?.discount?.amount || 0;
        const location = sub.location;
        const currency = getCurrency(location.country);

        if (sub.status === "trialing" && sub.trialEnd && isFuture(sub.trialEnd)) {
            const payload = buildRenewalPayload({
                sub,
                lid,
                location,
                memberLocationGatewayCustomerId: memberLocation.gatewayCustomerId || null,
                currency,
                taxRate: location.taxRates?.find((t) => t.isDefault)?.percentage || 0,
                promoMeta,
            });

            await db.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethod.value.id,
                metadata: {
                    ...(sub.metadata || {}),
                    paymentMethodId: paymentMethod.value.id,
                    gatewayService,
                },
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sub.id));

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
            paymentType: paymentMethod.value.type,
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
            paymentType: paymentMethod.value.type,
            invoiceType: "recurring",
            forPeriodStart: new Date(sub.currentPeriodStart),
            forPeriodEnd: new Date(sub.currentPeriodEnd),
            metadata: {
                type: "from-subscription",
                subscriptionId: sub.id,
                collectionMethod: "charge_automatically",
                gatewayService,
            },
        }).returning({
            id: memberInvoices.id,
        });

        if (!invoice) {
            return status(500, { error: "Failed to create invoice for activation" });
        }

        const chargeDescription = sub.pricing.downpayment
            ? `Downpayment for ${planName}`
            : `Payment for ${planName}`;
        let paymentIntentId: string;
        let squarePayment: SquarePaymentResult | undefined;

        try {
            if (gatewayService === "stripe") {
                const stripe = new StripePaymentGateway(integration.accessToken);
                const paymentResult = await withTimeout(
                    stripe.createCharge(memberLocation.gatewayCustomerId!, paymentMethod.value.id, {
                        ...chargeDetails,
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
                        productName: planName,
                        currency: currency || "usd",
                    }),
                    30000,
                    "Stripe payment timeout while activating subscription"
                );
                paymentIntentId = paymentResult.id;
            } else {
                const square = new SquarePaymentGateway(integration.accessToken);
                squarePayment = await withTimeout(
                    square.createCharge(memberLocation.gatewayCustomerId!, paymentMethod.value.id, {
                        ...chargeDetails,
                        currency: currency || "usd",
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
            console.error("[x/subscriptions/activate] process payment failed", {
                lid,
                sid,
                memberId: sub.memberId,
                paymentMethodId,
                gatewayService,
                message,
            });
            return status(502, { error: message });
        }

        try {
            await db.transaction(async (tx) => {
                await tx.update(memberInvoices).set({
                    status: gatewayService === "square" ? "paid" : "sent",
                    ...(gatewayService === "square" ? { paid: true, receiptUrl: squarePayment?.receiptUrl ?? null } : {}),
                    sentAt: new Date(),
                    updated: new Date(),
                    metadata: {
                        type: "from-subscription",
                        subscriptionId: sub.id,
                        collectionMethod: "charge_automatically",
                        paymentIntentId,
                        gatewayService,
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
                    ...(gatewayService === "square" ? { status: "active" } : {}),
                    metadata: {
                        ...(sub.metadata || {}),
                        hasPaidDownpayment: !!sub.pricing.downpayment,
                        paymentMethodId: paymentMethod.value.id,
                        gatewayService,
                        ...(promoMeta && {
                            promo: {
                                ...promoMeta,
                                applied: true,
                            },
                        }),
                    },
                }).where(eq(memberSubscriptions.id, sub.id));

                if (gatewayService === "square") {
                    const txValues = {
                        memberId: sub.memberId,
                        locationId: lid,
                        invoiceId: invoice.id,
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
                            invoiceId: invoice.id,
                            memberPlanId: sub.id,
                            memberSubscriptionId: sub.id,
                            gatewayService,
                            squarePaymentId: squarePayment?.id,
                            chargeId: squarePayment?.id,
                            squarePaymentStatus: squarePayment?.status,
                        },
                        items: lineItems,
                        updated: new Date(),
                    };

                    const [existingTransaction] = await tx
                        .select({ id: transactions.id })
                        .from(transactions)
                        .where(eq(transactions.invoiceId, invoice.id))
                        .limit(1);

                    if (existingTransaction) {
                        await tx.update(transactions).set(txValues).where(eq(transactions.id, existingTransaction.id));
                    } else {
                        await tx.insert(transactions).values(txValues);
                    }

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
            memberLocationGatewayCustomerId: memberLocation.gatewayCustomerId || null,
            currency,
            taxRate: taxRate?.percentage || 0,
            promoMeta,
        });

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
            ])),
            confirmNow: t.Optional(t.Boolean()),
        }),
    });
}

async function resolvePaymentMethod({
    gatewayService,
    accessToken,
    gatewayCustomerId,
    paymentMethodId,
    paymentType,
}: {
    gatewayService: GatewayService;
    accessToken: string;
    gatewayCustomerId: string;
    paymentMethodId: string;
    paymentType?: "card" | "us_bank_account";
}): Promise<
    | { ok: true; value: SubscriptionPaymentMethod }
    | { ok: false; statusCode: number; error: string }
> {
    if (gatewayService === "stripe") {
        if (!paymentType) {
            return { ok: false, statusCode: 400, error: "paymentType is required for Stripe subscription activation" };
        }
        return { ok: true, value: { id: paymentMethodId, type: paymentType } };
    }

    if (paymentMethodId.startsWith("cnon:")) {
        return { ok: false, statusCode: 400, error: "Saved Square card is required for subscription activation" };
    }

    if (gatewayCustomerId.startsWith("cus_")) {
        return { ok: false, statusCode: 400, error: "Member location does not have a Square customer ID" };
    }

    const square = new SquarePaymentGateway(accessToken);
    try {
        await square.retrieveCardForCustomer(gatewayCustomerId, paymentMethodId);
    } catch {
        return { ok: false, statusCode: 400, error: "Selected Square card is not available for this member" };
    }

    return { ok: true, value: { id: paymentMethodId, type: "card" } };
}

function buildRenewalPayload({
    sub,
    lid,
    location,
    memberLocationGatewayCustomerId,
    currency,
    taxRate,
    promoMeta,
}: {
    sub: NonNullable<Awaited<ReturnType<typeof db.query.memberSubscriptions.findFirst>>> & {
        member: { firstName: string; lastName: string | null; email: string };
        pricing: { name: string; price: number; interval: string | null; intervalThreshold: number | null };
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
}): SubscriptionJobData {
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
            name: sub.pricing.name,
            price: sub.pricing.price,
            interval: sub.pricing.interval as "day" | "week" | "month" | "year",
            intervalThreshold: sub.pricing.intervalThreshold!,
        },
        ...(promoMeta?.discount ? { discount: promoMeta.discount } : {}),
    };
}
