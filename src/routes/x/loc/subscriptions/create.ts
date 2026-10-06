import { fromZonedTime } from "date-fns-tz";
import { quoteSubscriptionInvoice } from "../invoices/subscriptionQuote";
import { getAdditionalFeesForCheckout } from "@/utils/additionalFees";
import { createDeferredBilling, type DeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import { calculateThresholdDate } from "@/utils";
import { memberSubscriptions } from "@/subtrees/schemas";
import { addDays } from "date-fns";
import type Elysia from "elysia";
import { t, status as httpStatus } from "elysia";
import { getDiscountDuration, type PromoDiscount } from "./shared";

const enrollmentBody = t.Object({
    memberId: t.String(),
    pricingId: t.String(),
    paymentType: t.Union([
        t.Literal("card"),
        t.Literal("us_bank_account"),
        t.Literal("link"),
        t.Literal("cashapp"),
        t.Literal("cash"),
    ]),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    trialDays: t.Optional(t.Number()),
    allowProration: t.Optional(t.Boolean()),
    promoCode: t.Optional(t.String()),
    enrollmentAttemptId: t.Optional(t.String({ format: "uuid" })),
    previewOnly: t.Optional(t.Boolean()),
    delayFirstPayment: t.Optional(t.Boolean()),
    firstPaymentDate: t.Optional(t.String()),
    prorateBeforeFirstPayment: t.Optional(t.Boolean()),
});

type EnrollmentBody = typeof enrollmentBody.static;

export async function createSubscriptionRoutes(app: Elysia) {
    return app.post("/", async ({ params, body, status }) => {
        const { lid } = params as { lid: string };
        const {
            memberId,
            pricingId,
            paymentType,
            startDate,
            endDate,
            trialDays,
            allowProration,
            promoCode,
            delayFirstPayment, firstPaymentDate, prorateBeforeFirstPayment,
        } = body;

        const enrollment = await prepareEnrollmentAttempt(lid, body);
        if ("response" in enrollment) return enrollment.response;
        const { subscriptionId, requestKey } = enrollment;
        const pricing = await db.query.memberPlanPricing.findFirst({
            where: (p, { eq }) => eq(p.id, pricingId),
            with: { plan: true },
        });

        if (!pricing || !pricing.plan) {
            return status(404, { error: "Pricing not found" });
        }

        if (pricing.plan.locationId !== lid || pricing.plan.archived) {
            return status(404, { error: "Pricing not found for this location" });
        }

        if (!pricing.interval || !pricing.intervalThreshold) {
            return status(400, { error: "Invalid pricing for subscription" });
        }

        const memberLocation = await db.query.memberLocations.findFirst({
            where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, memberId)),
            with: {
                member: {
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                location: {
                    with: {
                        taxRates: true,
                    },
                },
            },
        });

        if (!memberLocation?.member) {
            return status(404, { error: "Member not found in location" });
        }

        const baseStartDate = parseAccessStartDate(startDate, delayFirstPayment, memberLocation.location.timezone);
        if (!Number.isFinite(baseStartDate.getTime())) return status(400, { error: "Invalid access start date" });
        const currentPeriodEnd = calculateThresholdDate({
            startDate: baseStartDate,
            threshold: pricing.intervalThreshold,
            interval: pricing.interval,
        });

        let cancelAt: Date | null = endDate ? new Date(endDate) : null;
        if (!cancelAt && pricing.expireInterval && pricing.expireThreshold) {
            cancelAt = calculateThresholdDate({
                startDate: baseStartDate,
                threshold: pricing.expireThreshold,
                interval: pricing.expireInterval,
            }) || null;
        }

        const parsedTrialDays = typeof trialDays === "number" && trialDays > 0 ? trialDays : 0;
        const trialEnd = parsedTrialDays > 0 ? addDays(baseStartDate, parsedTrialDays) : null;

        const billing = prepareEnrollmentBilling({ delayFirstPayment, firstPaymentDate, prorateBeforeFirstPayment,
            startDate: baseStartDate, cancelAt, timezone: memberLocation.location.timezone,
            price: pricing.price, interval: pricing.interval, intervalThreshold: pricing.intervalThreshold, trialDays },
            currentPeriodEnd, allowProration, requestKey);
        if ("response" in billing) return billing.response;

        let promoData:
            | {
                promoId: string;
                discount: PromoDiscount;
                code: string;
            }
            | undefined;

        if (promoCode && promoCode.trim()) {
            const normalized = promoCode.trim().toUpperCase();
            const promo = await db.query.promos.findFirst({
                where: (p, { and, eq, gt, isNull, or }) =>
                    and(
                        eq(p.locationId, lid),
                        eq(p.code, normalized),
                        eq(p.isActive, true),
                        or(isNull(p.expiresAt), gt(p.expiresAt, new Date()))
                    ),
            });

            if (!promo) {
                return status(400, { error: "Invalid promo code", code: "PROMO_NOT_FOUND" });
            }

            if (promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions) {
                return status(400, { error: "Promo redemption limit reached", code: "PROMO_REDEMPTION_LIMIT_REACHED" });
            }

            if (promo.allowedPlans && promo.allowedPlans.length > 0 && !promo.allowedPlans.includes(pricing.id)) {
                return status(400, { error: "Promo not allowed for this pricing", code: "PROMO_NOT_ALLOWED_FOR_PRICING" });
            }

            const amount = promo.type === "fixed_amount"
                ? Math.min(pricing.price, promo.value)
                : Math.floor(pricing.price * (promo.value / 100));

            promoData = {
                promoId: promo.id,
                code: promo.code,
                discount: {
                    amount,
                    type: promo.type,
                    value: promo.value,
                    duration: getDiscountDuration({
                        duration: promo.duration,
                        durationInMonths: promo.durationInMonths,
                    }),
                    durationInMonths: promo.durationInMonths || 1,
                },
            };
        }

        if (body.previewOnly) {
            return previewDeferredEnrollment({ locationId: lid, pricing, location: memberLocation.location,
                deferredBilling: billing.deferredBilling, discount: promoData?.discount });
        }

        const classCredits = pricing.plan.classLimitInterval === "term"
            ? (pricing.plan.totalClassLimit || 0)
            : 0;

        const subscription = await persistSubscription({
            ...(subscriptionId ? { id: subscriptionId } : {}),
            memberId,
            memberPlanPricingId: pricing.id,
            locationId: lid,
            startDate: baseStartDate,
            currentPeriodStart: baseStartDate,
            currentPeriodEnd: billing.currentPeriodEnd,
            cancelAt,
            trialEnd,
            status: parsedTrialDays > 0 ? "trialing" : "incomplete",
            paymentType,
            classCredits,
            metadata: {
                commissionBilling: {
                    allowanceInterval: pricing.plan.classLimitInterval,
                    billingInterval: pricing.interval,
                    billingThreshold: pricing.intervalThreshold,
                    visitAllowance: pricing.plan.totalClassLimit,
                },
                ...billing.metadata,
                ...(promoData && {
                    promo: {
                        id: promoData.promoId,
                        code: promoData.code,
                        discount: promoData.discount,
                        applied: false,
                    },
                }),
            },
        }, requestKey);
        if (!subscription) return status(409, { error: "Enrollment details changed. Refresh and try again." });

        return status(201, {
            subscription,
            plan: pricing.plan,
            pricing,
            billingPreview: {
                discount: promoData?.discount.amount || 0,
                tax: 0,
                firstChargeTotal: Math.max(0, pricing.price - (promoData?.discount.amount || 0)),
                isTrial: parsedTrialDays > 0,
                trialEndsAt: trialEnd,
            },
        });
    }, {
        body: enrollmentBody,
    });
}

/** Reuse an existing enrollment when the same request is retried. Reject retries with different billing details. */
async function prepareEnrollmentAttempt(lid: string, body: EnrollmentBody) {
    const { delayFirstPayment, memberId, pricingId, paymentType, startDate, endDate,
        firstPaymentDate, prorateBeforeFirstPayment, promoCode } = body;
    const enrollmentKey = delayFirstPayment && !body.previewOnly ? body.enrollmentAttemptId : undefined;
    if (delayFirstPayment && !body.previewOnly && !enrollmentKey) return { response: httpStatus(400, { error: "Enrollment attempt ID is required" }) };
    const subscriptionId = enrollmentKey ? `sub_deferred_${enrollmentKey}` : undefined;
    const requestKey = JSON.stringify([lid, memberId, pricingId, paymentType, startDate, endDate, firstPaymentDate, !!prorateBeforeFirstPayment, promoCode || ""]);
    if (subscriptionId) {
        const existing = await db.query.memberSubscriptions.findFirst({ where: (row, { eq }) => eq(row.id, subscriptionId) });
        if (existing) {
            if (existing.metadata.enrollmentRequestKey !== requestKey) return { response: httpStatus(409, { error: "This enrollment attempt has different billing details" }) };
            return { response: httpStatus(200, { subscription: existing }) };
        }
    }
    return { subscriptionId, requestKey };
}

/** For a delayed first payment, a date without a time means midnight in the location timezone. */
function parseAccessStartDate(startDate: string | undefined, deferred: boolean | undefined, timezone: string) {
    if (deferred && startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return fromZonedTime(`${startDate}T00:00:00`, timezone);
    }
    return startDate ? new Date(startDate) : new Date();
}

type InvoiceQuoteInput = Parameters<typeof quoteSubscriptionInvoice>[0];

/** Calculate the first bill for the preview without creating a subscription, invoice, or charge. */
async function previewDeferredEnrollment({ locationId, pricing, location, deferredBilling, discount }: {
    locationId: string;
    pricing: InvoiceQuoteInput["pricing"];
    location: InvoiceQuoteInput["location"] & { timezone: string };
    deferredBilling: DeferredBilling | null;
    discount?: PromoDiscount;
}) {
    if (!deferredBilling) return httpStatus(400, { error: "Choose a delayed first payment date to preview" });
    const quote = quoteSubscriptionInvoice({
        locationId, subscriptionId: "preview", pricing, location,
        subscriptionMetadata: { deferredBilling },
        billingPhase: "initial", periodStart: new Date(deferredBilling.firstPaymentAt),
        discount: discount ? { type: discount.type, value: discount.value } : undefined,
        additionalFees: await getAdditionalFeesForCheckout(locationId, "subscription", "initial"),
    });
    return httpStatus(200, { billingPreview: {
        dueToday: 0, firstPaymentAt: deferredBilling.firstPaymentAt,
        timezone: location.timezone, firstChargeTotal: quote.total, prorationAmount: deferredBilling.prorationAmount,
        currency: quote.currency, recurringAmount: pricing.price, interval: pricing.interval, intervalThreshold: pricing.intervalThreshold,
    } });
}

/** If two requests create the same subscription, return the existing one only when their enrollment details match. */
async function persistSubscription(values: typeof memberSubscriptions.$inferInsert, requestKey: string) {
    const subscriptionId = values.id;
    const [inserted] = await db.insert(memberSubscriptions).values(values).onConflictDoNothing().returning();
    const subscription = inserted ?? (subscriptionId
        ? await db.query.memberSubscriptions.findFirst({ where: (row, { eq }) => eq(row.id, subscriptionId) })
        : null);
    if (!subscription || (subscriptionId && subscription.metadata.enrollmentRequestKey !== requestKey)) return null;
    return subscription;
}

/** Set currentPeriodEnd to the chosen first payment date and prepare the billing settings to save. */
function prepareEnrollmentBilling(
    input: Parameters<typeof createDeferredBilling>[0],
    ordinaryPeriodEnd: Date | null | undefined,
    allowProration: boolean | undefined,
    requestKey: string,
) {
    try {
        const deferredBilling = createDeferredBilling(input);
        return {
            deferredBilling,
            currentPeriodEnd: deferredBilling ? new Date(deferredBilling.firstPaymentAt) : ordinaryPeriodEnd || input.startDate,
            metadata: {
                allowProration: deferredBilling ? false : !!allowProration,
                ...(deferredBilling ? { deferredBilling, enrollmentRequestKey: requestKey } : {}),
            },
        };
    } catch (error) {
        return { response: httpStatus(400, { error: error instanceof Error ? error.message : "Invalid billing schedule" }) };
    }
}
