import { db } from "@/db/db";
import { calculateThresholdDate } from "@/libs/utils";
import { memberSubscriptions } from "@subtrees/schemas";
import { addDays } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { getDiscountDuration, type PromoDiscount } from "./shared";

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
        } = body;

        const pricing = await db.query.memberPlanPricing.findFirst({
            where: (p, { eq }) => eq(p.id, pricingId),
            with: { plan: true },
        });

        if (!pricing || !pricing.plan) {
            return status(404, { error: "Pricing not found" });
        }

        if (pricing.plan.locationId !== lid) {
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
                        stripeCustomerId: true,
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

        const baseStartDate = startDate ? new Date(startDate) : new Date();
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
                    duration: getDiscountDuration({
                        duration: promo.duration,
                        durationInMonths: promo.durationInMonths,
                    }),
                    durationInMonths: promo.durationInMonths || 1,
                },
            };
        }

        const classCredits = pricing.plan.classLimitInterval === "term"
            ? (pricing.plan.totalClassLimit || 0)
            : 0;

        const [subscription] = await db.insert(memberSubscriptions).values({
            memberId,
            memberPlanPricingId: pricing.id,
            locationId: lid,
            startDate: baseStartDate,
            currentPeriodStart: baseStartDate,
            currentPeriodEnd: currentPeriodEnd || baseStartDate,
            cancelAt,
            trialEnd,
            status: parsedTrialDays > 0 ? "trialing" : "incomplete",
            paymentType,
            classCredits,
            metadata: {
                allowProration: !!allowProration,
                ...(promoData && {
                    promo: {
                        id: promoData.promoId,
                        code: promoData.code,
                        discount: promoData.discount,
                        applied: false,
                    },
                }),
            },
        }).returning();

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
        body: t.Object({
            memberId: t.String(),
            pricingId: t.String(),
            paymentType: t.Union([
                t.Literal("card"),
                t.Literal("us_bank_account"),
                t.Literal("cash"),
            ]),
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String()),
            trialDays: t.Optional(t.Number()),
            allowProration: t.Optional(t.Boolean()),
            promoCode: t.Optional(t.String()),
        }),
    });
}
