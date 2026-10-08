import { db } from "@/db/db";
import { fetchEligiblePromo, PromoValidationError } from "@/utils/fetchPromo";
import { or } from "drizzle-orm";

export async function handlePromo(lid: string, code: string, pricingId?: string) {
    if (pricingId) {
        const pricing = await db.query.memberPlanPricing.findFirst({
            where: (pricing, { eq }) => eq(pricing.id, pricingId),
            with: { plan: true },
        });
        if (!pricing?.plan || pricing.plan.locationId !== lid || pricing.plan.archived) {
            return null;
        }
        try {
            return await fetchEligiblePromo({
                code,
                pricing,
                locationId: lid,
            });
        } catch (error) {
            if (error instanceof PromoValidationError) return null;
            throw error;
        }
    }

    return db.query.promos.findFirst({
        where: (p, { eq, and, gt, isNull }) => and(
            eq(p.locationId, lid),
            eq(p.code, code),
            eq(p.isActive, true),
            or(isNull(p.expiresAt), gt(p.expiresAt, new Date())),
        ),
        columns: {
            created: false,
            updated: false,
        },
    });
}
