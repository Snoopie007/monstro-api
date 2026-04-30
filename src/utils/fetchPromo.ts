import { db } from "@/db/db";
import type { MemberPlanPricing } from "@subtrees/types";


export async function fetchPromoDiscount(promoId: string | undefined, pricing: MemberPlanPricing) {
    if (!promoId) return 0;
    let discount: number = 0;
    try {
        const promo = await db.query.promos.findFirst({
            where: (promo, { eq, and, gt, isNull, or }) => and(
                eq(promo.id, promoId),
                eq(promo.isActive, true),
                or(
                    isNull(promo.expiresAt),
                    gt(promo.expiresAt, new Date())
                )
            ),
            columns: {
                redemptionCount: true,
                maxRedemptions: true,
                allowedPlans: true,
                type: true,
                value: true,
            },
        });
        if (promo) {
            const { value, redemptionCount, maxRedemptions, allowedPlans } = promo;
            const isWithinRedemption = !maxRedemptions || redemptionCount < maxRedemptions;
            const isAllowedPlan = allowedPlans && allowedPlans.includes(pricing.id);
            if (isWithinRedemption && isAllowedPlan) {
                if (promo.type === "fixed_amount") {
                    discount = Math.round(value);
                } else {
                    discount = Math.round(pricing.price * (value / 100));
                }
            }
        }
        return discount;
    } catch (error) {
        console.error(error);
        return 0;
    }
}
