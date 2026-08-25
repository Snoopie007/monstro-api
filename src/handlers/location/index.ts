import { db } from "@/db/db";

export async function getLocationById(lid: string) {
    const location = await db.query.locations.findFirst({
        where: (l, { eq }) => eq(l.id, lid),
        with: {
            taxRates: {
                where: (tr, { eq }) => eq(tr.isDefault, true),
            },
            locationState: {
                columns: {
                    locationId: true,
                    paymentGatewayId: true,
                    waiverId: true,
                    currency: true,
                    allowAppCheckIns: true,
                    settings: true,
                    usagePercent: true,
                },
            },
            additionalFees: {
                where: (af, { eq }) => eq(af.active, true),
            }
        },
    });

    if (!location) return null;

    const { taxRates, ...rest } = location;

    return {
        ...rest,
        taxRate: taxRates[0],
    };
}
