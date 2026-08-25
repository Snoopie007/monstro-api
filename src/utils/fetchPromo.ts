import { db } from "@/db/db";
import type { MemberPlanPricing } from "@subtrees/types";


export class PromoValidationError extends Error {
    constructor(message = "Promotion is not valid for this location and pricing") {
        super(message);
        this.name = "PromoValidationError";
    }
}

type PromoEligibilityInput = {
    promoId?: string;
    code?: string;
    pricing: MemberPlanPricing;
    locationId: string;
};

export async function fetchEligiblePromo({
    promoId,
    code,
    pricing,
    locationId,
}: PromoEligibilityInput) {
    if (!promoId && !code) return null;

    const promo = await db.query.promos.findFirst({
        where: (promo, { eq, and, gt, isNull, or }) => and(
            eq(promoId ? promo.id : promo.code, promoId ?? code!),
            eq(promo.locationId, locationId),
            eq(promo.isActive, true),
            or(
                isNull(promo.expiresAt),
                gt(promo.expiresAt, new Date()),
            ),
        ),
    });
    if (
        !promo ||
        !pricing.plan ||
        pricing.plan.locationId !== locationId ||
        pricing.plan.archived ||
        !promo.allowedPlans?.includes(pricing.id) ||
        (!!promo.maxRedemptions && promo.redemptionCount >= promo.maxRedemptions)
    ) {
        throw new PromoValidationError();
    }

    return promo;
}

export async function fetchPromoDiscount(
    promoId: string | undefined,
    pricing: MemberPlanPricing,
    locationId: string,
) {
    if (!promoId) return undefined;
    const promo = await fetchEligiblePromo({ promoId, pricing, locationId });
    if (!promo) return undefined;

    return {
        type: promo.type,
        value: promo.value,
        duration: promo.duration,
        durationInMonths: promo.durationInMonths,
    };
}
