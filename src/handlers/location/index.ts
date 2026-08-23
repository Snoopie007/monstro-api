import { db } from "@/db/db";

export async function getLocationById(lid: string) {
    const location = await db.query.locations.findFirst({
        where: (l, { eq }) => eq(l.id, lid),
        with: {
            taxRates: true,
            locationState: true,
            additionalFees: {
                where: (af, { eq }) => eq(af.status, 'active'),
            }
        },
    });

    if (!location) return null;

    const taxRate = location.taxRates.find((rate) => rate.isDefault) ?? location.taxRates[0];

    return {
        ...location,
        taxRate,
    };
}
