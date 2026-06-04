import { db } from "@/db/db";

export class EnrollContextError extends Error {
    readonly status: 404 | 400;

    constructor(status: 404 | 400, message: string) {
        super(message);
        this.name = "EnrollContextError";
        this.status = status;
    }
}

const memberLocationQuery = {
    with: {
        member: {
            columns: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        },
        location: {
            columns: {
                name: true,
                phone: true,
                email: true,
                country: true,
            },
            with: {
                taxRates: {
                    columns: {
                        percentage: true,
                        isDefault: true,
                    },
                },
                locationState: {
                    columns: {
                        paymentGatewayId: true,
                        planId: true,
                        currency: true,
                        usagePercent: true,
                        settings: true,
                        waiverId: true,
                    },
                },
            },
        },
    },
    columns: {
        gatewayCustomerId: true,
        signedWaiverId: true,
        onboarded: true,
        status: true,
    },
} as const;

export async function fetchEnrollContext({
    lid,
    mid,
    priceId,
}: {
    lid: string;
    mid: string;
    priceId: string;
}) {
    const [pricing, ml] = await Promise.all([
        db.query.memberPlanPricing.findFirst({
            where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
            with: { plan: true },
        }),
        db.query.memberLocations.findFirst({
            where: (memberLocation, { and, eq }) => and(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, lid),
            ),
            ...memberLocationQuery,
        }),
    ]);

    if (!ml) {
        throw new EnrollContextError(404, "Member or location not found");
    }

    if (!pricing) {
        throw new EnrollContextError(404, "Pricing not found");
    }

    const { gatewayCustomerId, location } = ml;

    if (!gatewayCustomerId) {
        throw new EnrollContextError(
            404,
            "Gateway customer not linked to this location",
        );
    }

    const { taxRates, locationState } = location;
    const { paymentGatewayId } = locationState;

    if (!paymentGatewayId) {
        throw new EnrollContextError(
            400,
            "This location does not have a payment gateway set.",
        );
    }

    const gateway = await db.query.integrations.findFirst({
        where: (integration, { eq }) => eq(integration.id, paymentGatewayId),
        columns: {
            accountId: true,
            accessToken: true,
            service: true,
            metadata: true,
        },
    });

    if (!gateway?.accountId || !gateway.accessToken) {
        throw new EnrollContextError(400, "Payment gateway not found");
    }

    const { accountId, accessToken, service, metadata } = gateway;

    return {
        pricing,
        ml,
        gateway: { accountId, accessToken, service, metadata },
        taxRates,
        locationState,
        gatewayCustomerId,
    };
}

export type EnrollContext = Awaited<ReturnType<typeof fetchEnrollContext>>;
