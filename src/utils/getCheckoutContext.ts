import { db } from "@/db/db";
import type { IntegrationMetadata } from "@subtrees/types";

export class CheckoutError extends Error {
	readonly status: 202 | 400 | 404 | 500;

	constructor(status: 202 | 400 | 404 | 500, message: string) {
		super(message);
		this.name = "CheckoutError";
		this.status = status;
	}
}
type CheckoutGateway =
	| { service: "stripe"; integrationId: string; accessToken: string; accountId: string; metadata: IntegrationMetadata }
	| { service: "square"; integrationId: string; accessToken: string; accountId: string; metadata: IntegrationMetadata }
	| { service: "authorize"; integrationId: string; apiKey: string; secretKey: string; accountId: string; metadata: IntegrationMetadata };


export async function getMemberCheckoutContext({
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

	const { location } = memberLocation;
	const { locationState, taxRates } = location;
	return { ml: memberLocation, locationState, taxRates };
}

export async function getCheckoutContext(input: {
	lid: string;
	mid: string;
}) {
	const { ml: memberLocation, locationState, taxRates } = await getMemberCheckoutContext(input);
	const { gatewayCustomerId } = memberLocation;

	if (!gatewayCustomerId) {
		throw new CheckoutError(400, "Gateway customer not found");
	}

	const { paymentGatewayId } = locationState;
	if (!paymentGatewayId) {
		throw new CheckoutError(400, "No payment gateway set");
	}
	const gateway = await db.query.integrations.findFirst({
		where: (g, { eq }) => eq(g.id, paymentGatewayId),
		columns: {
			id: true,
			accountId: true,
			apiKey: true,
			secretKey: true,
			accessToken: true,
			service: true,
			metadata: true,
		},
	});

	if (!gateway) {
		throw new CheckoutError(400, "Gateway not found");
	}

	const { accountId, service, metadata } = gateway;
	if (service === "authorize") {
		if (!gateway.apiKey || !gateway.secretKey) {
			throw new CheckoutError(400, "Authorize.net gateway credentials not found");
		}
		const authorizeGateway: CheckoutGateway = {
			service,
			integrationId: gateway.id,
			apiKey: gateway.apiKey,
			secretKey: gateway.secretKey,
			accountId,
			metadata: (metadata ?? {}) as IntegrationMetadata,
		};
		return { ml: memberLocation, gatewayCustomerId, locationState, taxRates, gateway: authorizeGateway };
	}

	if (service === "stripe" || service === "square") {
		if (!gateway.accessToken) {
			throw new CheckoutError(400, "Gateway credentials not found");
		}
		const cardGateway: CheckoutGateway = {
			service,
			accessToken: gateway.accessToken,
			integrationId: gateway.id,
			accountId,
			metadata: (metadata ?? {}) as IntegrationMetadata,
		};
		return { ml: memberLocation, gatewayCustomerId, locationState, taxRates, gateway: cardGateway };
	}

	throw new CheckoutError(400, "Unsupported payment gateway");
}

export type CheckoutContext = Awaited<ReturnType<typeof getCheckoutContext>>;
