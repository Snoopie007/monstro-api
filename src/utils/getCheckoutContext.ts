import { db } from "@/db/db";

export class CheckoutError extends Error {
	readonly status: 404 | 400;

	constructor(status: 404 | 400, message: string) {
		super(message);
		this.name = "CheckoutError";
		this.status = status;
	}
}

export async function getCheckoutContext({
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
			signedWaiverId: true,
		},
		with: {

			member: {
				columns: {
					id: true,
					userId: true,
					email: true,
					firstName: true,
					lastName: true,
				},
			},
			location: {
				with: {
					locationState: true,
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
		throw new CheckoutError(400, "Member location not found");
	}

	const { gatewayCustomerId, location } = memberLocation;

	if (!gatewayCustomerId) {
		throw new CheckoutError(400, "Gateway customer not found");
	}

	const { locationState, taxRates } = location;
	const { paymentGatewayId } = locationState;

	if (!paymentGatewayId) {
		throw new CheckoutError(400, "No payment gateway set");
	}

	const gateway = await db.query.integrations.findFirst({
		where: (g, { eq }) => eq(g.id, paymentGatewayId),
		columns: {
			accountId: true,
			accessToken: true,
			service: true,
			metadata: true,
			apiKey: true,
			secretKey: true,
		},
	});

	if (!gateway) {
		throw new CheckoutError(400, "Gateway not found");
	}
	if (gateway.service === "authorize") {
		if (!gateway.apiKey || !gateway.secretKey) {
			throw new CheckoutError(400, "Authorize.net gateway credentials not found");
		}
	} else if (!gateway.accessToken) {
		throw new CheckoutError(400, "Gateway credentials not found");
	}

	return {
		ml: memberLocation,
		gatewayCustomerId,
		taxRates,
		gateway,
	};
}

export type CheckoutContext = Awaited<ReturnType<typeof getCheckoutContext>>;
