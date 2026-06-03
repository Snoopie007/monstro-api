import { db } from "@/db/db";

export class MercCheckoutError extends Error {
    readonly status: 404 | 400;

    constructor(status: 404 | 400, message: string) {
        super(message);
        this.name = "MercCheckoutError";
        this.status = status;
    }
}

export async function fetchMercCheckoutContext({
    lid,
    mid,
}: {
    lid: string;
    mid: string;
}) {
    const memberLocation = await db.query.memberLocations.findFirst({
        where: (ml, { eq, and }) => and(
            eq(ml.memberId, mid),
            eq(ml.locationId, lid),
        ),
        columns: {
            gatewayCustomerId: true,
        },
        with: {
            location: {
                with: {
                    locationState: {
                        columns: {
                            currency: true,
                            paymentGatewayId: true,
                            settings: true,
                            usagePercent: true,
                        },
                    },
                    taxRates: {
                        columns: {
                            percentage: true,
                            isDefault: true,
                        },
                    },
                },
            },
        },
    });

    if (!memberLocation) {
        throw new MercCheckoutError(400, "Member location not found");
    }

    const { gatewayCustomerId, location } = memberLocation;

    if (!gatewayCustomerId) {
        throw new MercCheckoutError(400, "Gateway customer not found");
    }

    const { locationState, taxRates } = location;
    const { paymentGatewayId } = locationState;

    if (!paymentGatewayId) {
        throw new MercCheckoutError(400, "No payment gateway set");
    }

    const gateway = await db.query.integrations.findFirst({
        where: (g, { eq }) => eq(g.id, paymentGatewayId),
        columns: {
            accountId: true,
            accessToken: true,
            service: true,
            metadata: true,
        },
    });

    if (!gateway?.accessToken) {
        throw new MercCheckoutError(400, "Gateway not found");
    }

    const { accessToken, accountId, service, metadata } = gateway;

    return {
        gatewayCustomerId,
        locationState,
        taxRates,
        gateway: { accessToken, accountId, service, metadata },
    };
}

export type MercCheckoutContext = Awaited<ReturnType<typeof fetchMercCheckoutContext>>;
