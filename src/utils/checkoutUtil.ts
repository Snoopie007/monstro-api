
import { createHash } from "node:crypto";
import { AuthorizePaymentGateway, AuthorizeTransportError, SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import type { CheckoutContext } from "./getCheckoutContext";
import type { PaymentType } from "@/subtrees/types";
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

export class CheckoutPendingError extends Error {
	readonly status = 202;
	constructor(readonly transactionId: string, message = "Payment is still pending; do not retry") {
		super(message);
		this.name = "CheckoutPendingError";
	}
}


export type ChargeWithGatewayInput = {
	gateway: CheckoutContext["gateway"];
	gatewayCustomerId: string;
	paymentMethodId: string;
	transactionId: string;
	total: number;
	feesAmount: number;
	currency: string;
	description: string;
	note: string;
	metadata: Record<string, string>;
	paymentType: PaymentType;
};

export type ChargeWithGatewayResult =
	PaymentMethodDisplay & (
		{
			status: "approved";
			paymentIntentId: string;
			gatewayMetadata: Record<string, unknown>;
		}
		| {
			status: "failed";
			paymentIntentId?: string;
			failureReason: string;
			failureCode: string;
			gatewayMetadata: Record<string, unknown>;
		}
		| {
			status: "uncertain";
			paymentIntentId?: string;
			paymentIntentStatus?: string;
			message: string;
			gatewayMetadata: Record<string, unknown>;
		});

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
	if (pm.type === "link" || pm.type === "cashapp") {
		return { paymentType: pm.type };
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
export function stripePaymentIntentFromError(error: unknown): { id: string; status?: string } | null {
	if (!error || typeof error !== "object") return null;
	const candidate = (error as { payment_intent?: unknown }).payment_intent;
	if (candidate && typeof candidate === "object") {
		const id = (candidate as { id?: unknown }).id;
		const status = (candidate as { status?: unknown }).status;
		if (typeof id === "string") return { id, ...(typeof status === "string" ? { status } : {}) };
	}
	if (typeof candidate === "string") return { id: candidate };
	return null;
}


export async function chargeWithGateway(input: ChargeWithGatewayInput): Promise<ChargeWithGatewayResult> {
	const {
		gateway,
		gatewayCustomerId,
		paymentMethodId,
		transactionId,
		total,
		feesAmount,
		currency,
		description,
		note,
		metadata,
		paymentType,
	} = input;

	if (total === 0) {
		return {
			status: "approved",
			paymentIntentId: `free_${transactionId}`,
			paymentType,
			gatewayMetadata: { noCharge: true },
		};
	}

	if (gateway.service === "authorize") {
		if (paymentType !== "card") {
			throw new PaymentChargeError("Authorize.net only supports saved card payments here");
		}
		const authorize = new AuthorizePaymentGateway(gateway.apiKey, gateway.secretKey);
		try {
			const billingAttemptId = metadata.billingAttemptId;
			const charge = await authorize.createCharge(gatewayCustomerId, paymentMethodId, {
				total,
				currency,
				idempotencyKey: transactionId,
				referenceId: billingAttemptId ? createHash("sha256").update(billingAttemptId).digest("hex").slice(0, 20) : transactionId,
				orderDescription: billingAttemptId && metadata.invoiceId ? `monstro-invoice:${metadata.invoiceId}` : description,
			});
			const gatewayMetadata = {
				gatewayService: "authorize",
				authorizeResponseCode: charge.responseCode,
				...(charge.responseMessage ? { authorizeResponseMessage: charge.responseMessage } : {}),
				...(charge.avsResultCode ? { authorizeAvsResultCode: charge.avsResultCode } : {}),
				...(charge.cavvResultCode ? { authorizeCavvResultCode: charge.cavvResultCode } : {}),
			};
			switch (charge.status) {
				case "approved":
					return {
						status: "approved",
						paymentIntentId: charge.transactionId,
						paymentType: "card",
						gatewayMetadata,
					};
				case "held":
					return {
						status: "uncertain",
						paymentIntentId: charge.transactionId,
						paymentIntentStatus: "processing",
						message: charge.responseMessage ?? "Authorize.net held the transaction for review",
						paymentType: "card",
						gatewayMetadata,
					};
				case "failed":
					return {
						status: "failed",
						...(charge.transactionId ? { paymentIntentId: charge.transactionId } : {}),
						failureReason: charge.responseMessage,
						failureCode: charge.failureCode,
						paymentType: "card",
						gatewayMetadata,
					};
				default: {
					const exhaustive: never = charge;
					throw new Error(`Unknown Authorize.net charge result: ${exhaustive}`);
				}
			}
		} catch (error) {
			if (error instanceof AuthorizeTransportError) {
				return {
					status: "uncertain",
					message: error.message,
					gatewayMetadata: { gatewayService: "authorize" },
				};
			}
			throw error;
		}
	}

	if (gateway.service === "stripe") {
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
				idempotencyKey: transactionId,
			},
		);
		const display = displayFromStripePaymentMethod(paymentResult.payment_method);
		if (paymentResult.status !== "succeeded") {
			return {
				status: "uncertain",
				paymentIntentId: paymentResult.id,
				paymentIntentStatus: paymentResult.status,
				message: `Stripe payment intent is ${paymentResult.status}`,
				gatewayMetadata: {
					gatewayService: gateway.service,
					paymentIntentStatus: paymentResult.status,
				},
				...display,
			};
		}
		return {
			status: "approved",
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
		const squareLocationId = gateway.metadata?.squareLocationId;
		if (!squareLocationId) {
			throw new PaymentChargeError("Square location ID not found");
		}
		const square = new SquarePaymentGateway(gateway.accessToken);
		const payment = await square.createCharge(gatewayCustomerId, paymentMethodId, {
			total,
			feesAmount,
			currency: currency as Currency,
			referenceId: transactionId,
			squareLocationId,
			note,
			idempotencyKey: transactionId,
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
			status: "approved",
			paymentIntentId: payment.id,
			gatewayMetadata: {
				gatewayService: gateway.service,
				squarePaymentId: payment.id,
				squarePaymentStatus: payment.status,
			},
			...display,
		};
	}
	const exhaustive: never = gateway;
	throw new PaymentChargeError(
		`Unknown payment gateway: ${exhaustive}`,
		"NO_PAYMENT_GATEWAY",
	);
}
