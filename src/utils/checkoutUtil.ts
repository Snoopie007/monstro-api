import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import type { CheckoutContext } from "./getCheckoutContext";
import type { PaymentType } from "@subtrees/types";
import type { Currency } from "square";

export class PaymentChargeError extends Error {
	readonly status: 400;
	readonly code?: string;

	constructor(message: string, code?: string) {
		super(message);
		this.name = "PaymentChargeError";
		this.status = 400;
		this.code = code;
	}
}

export type ChargeWithGatewayInput = {
	gateway: CheckoutContext["gateway"];
	gatewayCustomerId: string;
	paymentMethodId: string;
	total: number;
	feesAmount: number;
	currency: string;
	description: string;
	referenceId: string;
	note?: string;
	metadata?: Record<string, string>;
	paymentType?: PaymentType;
	authorizeOnly?: boolean;
};

export type ChargeWithGatewayResult = {
	paymentIntentId: string;
	gatewayMetadata: Record<string, unknown>;
};

export async function chargeWithGateway(input: ChargeWithGatewayInput): Promise<ChargeWithGatewayResult> {
	const {
		gateway,
		gatewayCustomerId,
		paymentMethodId,
		total,
		feesAmount,
		currency,
		description,
		referenceId,
		note,
		metadata,
		paymentType = "card",
		authorizeOnly = true,
	} = input;

	if (gateway.service === "stripe") {
		if (!gateway.accessToken) {
			throw new PaymentChargeError("No payment gateway configured for this location", "NO_PAYMENT_GATEWAY");
		}
		const stripe = new StripePaymentGateway(gateway.accessToken);
		const paymentResult = await stripe.createChargeWithoutLineItems(
			gatewayCustomerId,
			paymentMethodId,
			{
				authorizeOnly,
				description,
				total,
				currency: currency as Currency,
				feesAmount,
				metadata,
			},
		);
		return {
			paymentIntentId: paymentResult.id,
			gatewayMetadata: {
				gatewayService: gateway.service,
			},
		};
	}

	if (gateway.service === "square") {
		if (paymentType !== "card") {
			throw new PaymentChargeError("Square only supports saved card payments here");
		}
		if (!gateway.accessToken) {
			throw new PaymentChargeError("No payment gateway configured for this location", "NO_PAYMENT_GATEWAY");
		}
		const squareLocationId = gateway.metadata?.squareLocationId;
		if (!squareLocationId) {
			throw new PaymentChargeError("Square location ID not found");
		}
		const square = new SquarePaymentGateway(gateway.accessToken);
		const payment = await square.createCharge(gatewayCustomerId, paymentMethodId, {
			total,
			feesAmount,
			currency: currency as Currency,
			referenceId,
			squareLocationId,
			note,
		});

		if (!payment?.id) {
			throw new PaymentChargeError("Payment was not created");
		}

		const status = (payment.status || "").toUpperCase();
		if (status !== "COMPLETED") {
			throw new PaymentChargeError("Payment was not completed", "PAYMENT_INCOMPLETE");
		}

		return {
			paymentIntentId: payment.id,
			gatewayMetadata: {
				gatewayService: gateway.service,
				squarePaymentId: payment.id,
				squarePaymentStatus: payment.status,
			},
		};
	}

	throw new PaymentChargeError(
		"No payment gateway configured for this location",
		"NO_PAYMENT_GATEWAY",
	);
}
