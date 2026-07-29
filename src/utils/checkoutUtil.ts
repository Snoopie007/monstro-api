import { SquarePaymentGateway, StripePaymentGateway, AuthorizeNetPaymentGateway } from "@/libs/PaymentGateway";
import type { CheckoutContext } from "./getCheckoutContext";
import type { PaymentType } from "@subtrees/types";
import type { Currency, Payment } from "square";
import type Stripe from "stripe";

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
	referenceId?: string;
	note?: string;
	metadata?: Record<string, string>;
	paymentType?: PaymentType;
};

export type ChargeWithGatewayResult = {
	paymentIntentId: string;
	gatewayMetadata: Record<string, unknown>;
	brand?: string;
	last4?: string;
	paymentType?: PaymentType;
};

type PaymentMethodDisplay = {
	brand?: string;
	last4?: string;
	paymentType?: PaymentType;
};

function displayFromStripePaymentMethod(
	pm: Stripe.PaymentMethod | string | null | undefined,
): PaymentMethodDisplay {
	if (!pm || typeof pm === "string") return {};
	if (pm.type === "card" && pm.card) {
		return {
			paymentType: "card",
			brand: pm.card.brand ?? undefined,
			last4: pm.card.last4 ?? undefined,
		};
	}
	if (pm.type === "us_bank_account" && pm.us_bank_account) {
		return {
			paymentType: "us_bank_account",
			brand: pm.us_bank_account.bank_name ?? undefined,
			last4: pm.us_bank_account.last4 ?? undefined,
		};
	}
	return {};
}

function displayFromSquarePayment(payment: Payment | undefined | null): PaymentMethodDisplay {
	const card = payment?.cardDetails?.card;
	if (!card) return {};
	return {
		paymentType: "card",
		brand: card.cardBrand ? String(card.cardBrand).toLowerCase() : undefined,
		last4: card.last4 ? String(card.last4) : undefined,
	};
}

function displayFromAuthorizeTransaction(transaction: Record<string, unknown> | undefined): PaymentMethodDisplay {
	if (!transaction) return {};
	const accountType = typeof transaction.accountType === "string" ? transaction.accountType : undefined;
	const accountNumber = typeof transaction.accountNumber === "string" ? transaction.accountNumber : undefined;
	const last4 = accountNumber ? accountNumber.replace(/\D/g, "").slice(-4) || undefined : undefined;
	const isEcheck = accountType?.toLowerCase() === "echeck";
	return {
		paymentType: isEcheck ? "us_bank_account" : "card",
		brand: accountType,
		last4,
	};
}

/** Charges a saved payment method via the location's gateway (Stripe, Square, or Authorize.net). */
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
				description,
				total,
				currency: currency as Currency,
				feesAmount,
				metadata,
			},
		);
		const display = displayFromStripePaymentMethod(paymentResult.payment_method);
		return {
			paymentIntentId: paymentResult.id,
			gatewayMetadata: {
				gatewayService: gateway.service,
			},
			...display,
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

		const display = displayFromSquarePayment(payment);
		return {
			paymentIntentId: payment.id,
			gatewayMetadata: {
				gatewayService: gateway.service,
				squarePaymentId: payment.id,
				squarePaymentStatus: payment.status,
			},
			...display,
		};
	}

	if (gateway.service === "authorize") {
		if (!gateway.apiKey || !gateway.secretKey) {
			throw new PaymentChargeError("No payment gateway configured for this location", "NO_PAYMENT_GATEWAY");
		}
		const authorize = new AuthorizeNetPaymentGateway(gateway.apiKey, gateway.secretKey);
		const payment = await authorize.createCharge(gatewayCustomerId, paymentMethodId, {
			total,
			currency: currency as Currency,
		});
		const paymentIntentId = typeof payment?.transId === "string" ? payment.transId : "";
		if (!paymentIntentId || paymentIntentId === "0") {
			throw new PaymentChargeError("Payment was not created");
		}
		const display = displayFromAuthorizeTransaction(payment);
		return {
			paymentIntentId,
			gatewayMetadata: {
				gatewayService: gateway.service,
			},
			...display,
		};
	}

	throw new PaymentChargeError(
		"No payment gateway configured for this location",
		"NO_PAYMENT_GATEWAY",
	);
}
