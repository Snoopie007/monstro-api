import { db } from "@/db/db";
import { memberLocations, orders, productImages, productVariants, transactions } from "@subtrees/schemas";
import { eq, sql } from "drizzle-orm";
import { StripePaymentGateway, SquarePaymentGateway } from "@/libs/PaymentGateway";

type GatewayService = "stripe" | "square";

/**
 * Charges the member's saved payment method and records the transaction.
 *
 * 1. Resolves the location's payment gateway (Stripe or Square) and verifies
 *    the member has a gateway customer ID.
 * 2. Charges the gateway using the provided paymentMethodId for the order total.
 * 3. Inserts a `transactions` row inside a DB transaction, then links it back
 *    to the order via `transactionId`.
 *
 * Only USD is supported for merchandise orders.
 *
 * @throws If the member has no gateway customer ID, the gateway is misconfigured,
 *         or the charge itself fails.
 */
export async function capturePayment(
	orderId: string,
	lid: string,
	memberId: string,
	paymentMethodId: string,
	subtotal: number,
	shipping: number,
	tax: number,
	total: number,
	currency: string,
) {
	// Look up the member's gateway customer ID (stripe or square customer reference).
	const memberLocation = await db.query.memberLocations.findFirst({
		where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, memberId)),
		columns: { gatewayCustomerId: true },
	});

	if (!memberLocation?.gatewayCustomerId) {
		throw new Error("Member does not have a gateway customer ID");
	}

	// Fetch the location with its integrations and the selected paymentGatewayId
	// from locationState so we know which gateway to use.
	const location = await db.query.locations.findFirst({
		where: (l, { eq }) => eq(l.id, lid),
		columns: { id: true },
		with: {
			integrations: {
				columns: { id: true, accountId: true, service: true, accessToken: true, metadata: true },
			},
			locationState: {
				columns: { paymentGatewayId: true },
			},
		},
	});

	if (!location) throw new Error("Location not found");

	// Find the integration matching the location's default gateway,
	// or fall back to the first available integration.
	const gatewayIntegration = location.integrations?.find(
		(c) => c.id === location.locationState?.paymentGatewayId
	) ?? location.integrations?.[0];

	if (!gatewayIntegration?.accessToken) throw new Error("Payment gateway integration not found");
	if (gatewayIntegration.service !== "stripe" && gatewayIntegration.service !== "square") {
		throw new Error("Unsupported payment gateway");
	}

	const gatewayService = gatewayIntegration.service as GatewayService;

	// Square charges require a Square location ID (stored in the integration's metadata).
	const squareLocationId = gatewayService === "square"
		? (() => {
			try {
				const meta = typeof gatewayIntegration.metadata === "string"
					? JSON.parse(gatewayIntegration.metadata)
					: gatewayIntegration.metadata ?? {};
				return meta?.squareLocationId ?? "";
			} catch { return ""; }
		})()
		: "";

	if (gatewayService === "square" && !squareLocationId) {
		throw new Error("Square location ID not found");
	}

	// Both gateway libs use the Square SDK's Currency enum — cast as any since
	// we only pass "USD" today.
	const supportedCurrency = "USD";
	const gatewayCurrency = supportedCurrency as any;

	// Charge via the appropriate gateway. Stripe returns the PaymentIntent ID
	// directly; Square returns a payment object.
	let paymentIntentId: string;
	if (gatewayService === "stripe") {
		const stripe = new StripePaymentGateway(gatewayIntegration.accessToken);
		const { id } = await stripe.createCharge(memberLocation.gatewayCustomerId, paymentMethodId, {
			total,
			unitCost: subtotal,
			feesAmount: 0,
			currency: gatewayCurrency,
			tax,
			description: `Merchandise order ${orderId}`,
			productName: `Order ${orderId}`,
			metadata: { lid, memberId, orderId, gatewayService },
		});
		paymentIntentId = id;
	} else {
		const square = new SquarePaymentGateway(gatewayIntegration.accessToken);
		const payment = await square.createCharge(memberLocation.gatewayCustomerId, paymentMethodId, {
			total,
			feesAmount: 0,
			currency: gatewayCurrency,
			squareLocationId,
			referenceId: orderId,
			note: `Merchandise order ${orderId}`,
		});
		paymentIntentId = payment?.id ?? "";
	}

	if (!paymentIntentId) throw new Error("Failed to process payment");

	// Inside a DB transaction, insert the transaction record and link it to the
	// order. Both must succeed or neither takes effect — prevents orphan
	// transactions if the order update fails.
	await db.transaction(async (tx) => {
		const [txn] = await tx.insert(transactions).values({
			locationId: lid,
			memberId,
			description: `Merchandise order ${orderId}`,
			type: "inbound" as any,
			status: "paid" as any,
			paymentType: "card" as any,
			paymentMethodId,
			paymentIntentId,
			total,
			subTotal: subtotal,
			currency: supportedCurrency as any,
			items: [],
			metadata: { orderId, gatewayService, chargeId: paymentIntentId },
		}).returning();

		if (txn) {
			await tx.update(orders).set({
				status: "paid",
				transactionId: txn.id,
				paymentIntentId,
				updated: new Date(),
			}).where(eq(orders.id, orderId));
		}
	});
}

/**
 * Adjusts variant stock levels for all items in an order by a direction.
 *
 * Uses a single `CASE WHEN` UPDATE so that N items produce exactly 1 query
 * instead of N separate round-trips (avoiding an N+1 problem).
 *
 * @param orderId  The order whose items should have their stock adjusted.
 * @param direction  -1 to decrement (reserve stock on create),
 *                   +1 to increment (restore stock on cancel/refund).
 */
export async function adjustStock(orderId: string, direction: 1 | -1) {
	// Fetch all order_items for this order — only the variantId and quantity
	// are needed for the stock adjustment.
	const items = await db.query.orderItems.findMany({
		where: eq(orderItems.orderId, orderId),
		columns: { variantId: true, quantity: true },
	});

	if (items.length === 0) return;

	// Build a CASE clause per item: "WHEN id = 'v1' THEN stock + (-2)"
	// sql.join concatenates them with a space separator.
	const cases = items.map(
		(item) => sql`WHEN ${productVariants.id} = ${item.variantId} THEN ${productVariants.stock} + ${item.quantity * direction}`
	);

	// Single UPDATE: sets stock = CASE ... END for all affected variants,
	// limited to only the variants that appear in the order.
	await db.update(productVariants)
		.set({
			stock: sql`CASE ${sql.join(cases, sql` `)} ELSE ${productVariants.stock} END`,
		})
		.where(sql`${productVariants.id} IN (${sql.join(items.map((i) => i.variantId), sql`, `)})`);
}
