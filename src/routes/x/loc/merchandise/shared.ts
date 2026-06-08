import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { fetchMercCheckoutContext } from "@/utils";
import { orders, productVariants } from "@subtrees/schemas";
import { eq, inArray } from "drizzle-orm";
import type { Currency } from "square";

export async function adjustStock(orderId: string, quantityMultiplier: 1 | -1) {
	const order = await db.query.orders.findFirst({
		where: eq(orders.id, orderId),
		columns: { items: true },
	});
	if (!order || order.items.length === 0) return;

	const variantIds: string[] = [];
	const seenVariantIds = new Set<string>();
	for (const item of order.items) {
		if (!seenVariantIds.has(item.variantId)) {
			seenVariantIds.add(item.variantId);
			variantIds.push(item.variantId);
		}
	}

	const variants = await db.query.productVariants.findMany({
		where: inArray(productVariants.id, variantIds),
		columns: { id: true, stock: true },
	});
	const stockByVariantId = new Map(variants.map((variant) => [variant.id, variant.stock]));

	for (const item of order.items) {
		const currentStock = stockByVariantId.get(item.variantId);
		if (typeof currentStock !== "number") continue;

		const nextStock = currentStock + item.quantity * quantityMultiplier;
		stockByVariantId.set(item.variantId, nextStock);
		await db.update(productVariants)
			.set({ stock: nextStock, updated: new Date() })
			.where(eq(productVariants.id, item.variantId));
	}
}

export async function markOrderPaid(orderId: string) {
	await db.update(orders)
		.set({ status: "paid", updated: new Date() })
		.where(eq(orders.id, orderId));
}

type CaptureGatewayPaymentInput = {
	orderId: string;
	lid: string;
	memberId: string;
	paymentMethodId: string;
	subtotal: number;
	shipping: number;
	tax: number;
	total: number;
	currency: Currency;
};

/**
 * Reserved for future member-checkout payment reconciliation.
 *
 * This is intentionally not called by the vendor manual "Mark as Paid" route.
 * Vendor manual capture only updates the order row through markOrderPaid until
 * member checkout status reconciliation is designed with the checkout flow.
 */
export async function captureGatewayPaymentAndMarkOrderPaid(input: CaptureGatewayPaymentInput) {
	const {
		orderId,
		lid,
		memberId,
		paymentMethodId,
		subtotal,
		shipping,
		tax,
		total,
		currency,
	} = input;
	const { gatewayCustomerId, gateway } = await fetchMercCheckoutContext({ lid, mid: memberId });
	const feesAmount = Math.max(total - subtotal - shipping - tax, 0);
	let gatewayPaymentId: string | null;

	if (gateway.service === "stripe") {
		const stripe = new StripePaymentGateway(gateway.accessToken);
		const paymentIntent = await stripe.createOrder(gatewayCustomerId, paymentMethodId, {
			customerId: gatewayCustomerId,
			paymentMethodId,
			total,
			currency,
			feesAmount,
			metadata: {
				memberId,
				locationId: lid,
				lid,
				orderId,
			},
		});

		if (paymentIntent.status !== "succeeded") {
			throw new Error(`Stripe payment did not succeed: ${paymentIntent.status}`);
		}
		gatewayPaymentId = paymentIntent.id;
	} else if (gateway.service === "square") {
		const square = new SquarePaymentGateway(gateway.accessToken);
		const squareLocationId = gateway.metadata?.squareLocationId;
		if (!squareLocationId) throw new Error("Square location ID not found");

		const payment = await square.createCharge(gatewayCustomerId, paymentMethodId, {
			total,
			feesAmount,
			currency,
			referenceId: orderId,
			squareLocationId,
			note: `orderId:${orderId}|mid:${memberId}|locationId:${lid}|pmid:${paymentMethodId}`,
		});

		if (payment?.status !== "COMPLETED") {
			throw new Error(`Square payment did not complete: ${payment?.status ?? "unknown"}`);
		}
		gatewayPaymentId = payment.id ?? null;
	} else {
		throw new Error(`Unsupported payment gateway service: ${gateway.service}`);
	}

	await db.update(orders)
		.set({ status: "paid", gatewayPaymentId, updated: new Date() })
		.where(eq(orders.id, orderId));
}
