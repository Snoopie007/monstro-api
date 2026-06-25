import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import { eventRegistrations, eventTickets, integrations, locationEvents, locationState, memberLocations, transactions } from "@subtrees/schemas";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { SquareError } from "square";
import Stripe from "stripe";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

type PaymentType = "cash" | "card" | "us_bank_account";

export const eventRegistrationRoutes = new Elysia()
	.post("/:eventId/registrations", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };
		const body = ctx.body;
		const memberId = body.memberId;
		const ticketId = body.ticketId;
		const paymentType: PaymentType = body.paymentType ?? "cash";
		const paymentMethodId = body.paymentMethodId ?? null;

		try {
			const [memberLocation, event, ticket, duplicate] = await Promise.all([
				db.query.memberLocations.findFirst({ where: and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, lid)) }),
				db.query.locationEvents.findFirst({ where: and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)) }),
				db.query.eventTickets.findFirst({ where: and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, eventId)) }),
				db.query.eventRegistrations.findFirst({ where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.memberId, memberId), inArray(eventRegistrations.status, ["registered", "attended"])) }),
			]);
			if (!memberLocation) return status(404, { error: "Member not found at this location" });
			if (!event) return status(404, { error: "Event not found" });
			if (!ticket) return status(404, { error: "Ticket not found" });
			if (duplicate) return status(409, { error: "Member is already registered for this event" });

			const now = new Date();
			if (event.status !== "published" || event.endsAt <= now) return status(400, { error: "Event is not open for registration" });
			if (ticket.status !== "active") return status(400, { error: "Ticket is not active" });
			if (ticket.saleStartsAt && ticket.saleStartsAt > now) return status(400, { error: "Ticket sale has not started" });
			if (ticket.saleEndsAt && ticket.saleEndsAt < now) return status(400, { error: "Ticket sale has ended" });

			const total = ticket.pricingMethod === "free" ? 0 : ticket.price;
			const [location] = await db
				.select({ currency: locationState.currency })
				.from(locationState)
				.where(eq(locationState.locationId, lid))
				.limit(1);
			const currency = location?.currency ?? "USD";

			const result = await db.transaction(async (tx) => {
				await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${eventId}))`);
				const lockedDuplicate = await tx.query.eventRegistrations.findFirst({ where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.memberId, memberId), inArray(eventRegistrations.status, ["registered", "attended"])) });
				if (lockedDuplicate) return { error: "Member is already registered for this event", status: 409 as const };

				const [registered] = await tx
					.select({ count: count() })
					.from(eventRegistrations)
					.where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));
				if (event.capacity != null && (registered?.count ?? 0) >= event.capacity) return { error: "Event is sold out", status: 409 as const };

				const [sold] = await tx
					.select({ count: count() })
					.from(eventRegistrations)
					.where(and(eq(eventRegistrations.ticketId, ticketId), eq(eventRegistrations.status, "registered")));
				if (ticket.quantity != null && (sold?.count ?? 0) >= ticket.quantity) return { error: "Ticket is sold out", status: 409 as const };

				let paymentIntentId: string | null = null;
				let chargeId: string | null = null;
				let gatewayService: "stripe" | "square" | null = null;

				if (total > 0 && paymentType !== "cash") {
					if (!paymentMethodId) return { error: "Payment method is required", status: 400 as const };
					if (!memberLocation.gatewayCustomerId) return { error: "Member is missing a payment customer", status: 400 as const };

					const gatewayServiceToUse = memberLocation.gatewayCustomerId.startsWith("cus_") ? "stripe" : "square";
					const gateway = await db.query.integrations.findFirst({ where: and(eq(integrations.locationId, lid), eq(integrations.service, gatewayServiceToUse)) });
					if (!gateway?.accessToken) return { error: "No payment gateway configured for this location", code: "NO_PAYMENT_GATEWAY", status: 400 as const };

					try {
						if (gateway.service === "stripe") {
							if (!memberLocation.gatewayCustomerId.startsWith("cus_")) return { error: "Member is missing a Stripe customer", status: 400 as const };
							const stripe = new StripePaymentGateway(gateway.accessToken);
							const savedMethod = await stripe.retrievePaymentMethod(memberLocation.gatewayCustomerId, paymentMethodId);
							if (savedMethod.type !== paymentType) return { error: "Payment method not found for this member", status: 400 as const };
							const intent = await stripe.createCharge(memberLocation.gatewayCustomerId, paymentMethodId, { total, unitCost: total, tax: 0, feesAmount: 0, currency, description: `${event.name} - ${ticket.name}`, productName: ticket.name, metadata: { lid, locationId: lid, eventId, ticketId, memberId } });
							paymentIntentId = intent.id;
							chargeId = intent.id;
							gatewayService = "stripe";
						} else if (gateway.service === "square") {
							if (paymentType !== "card") return { error: "Square only supports saved card payments here", status: 400 as const };
							const metadata = gateway.metadata;
							const squareLocationId = typeof metadata === "object" && metadata !== null && "squareLocationId" in metadata
								? String(metadata.squareLocationId || "")
								: "";
							if (!squareLocationId) return { error: "Square location ID not found", status: 400 as const };
							const square = new SquarePaymentGateway(gateway.accessToken);
							await square.retrieveCardForCustomer(memberLocation.gatewayCustomerId, paymentMethodId);
							const payment = await square.createCharge(memberLocation.gatewayCustomerId, paymentMethodId, { total, feesAmount: 0, currency, referenceId: eventId, squareLocationId, note: `${event.name} - ${ticket.name}` });
							paymentIntentId = payment?.id || null;
							chargeId = payment?.id || null;
							gatewayService = "square";
						} else {
							return { error: "No payment gateway configured for this location", code: "NO_PAYMENT_GATEWAY", status: 400 as const };
						}
					} catch (error) {
						const mapped = error instanceof Stripe.errors.StripeError
							? handleStripeError({ error })
							: error instanceof SquareError
								? handleSquareError(error)
								: { code: "UNKNOWN_ERROR", message: "unable to process payment" };
						return { error: mapped.message, code: mapped.code, status: 400 as const };
					}
				}

				let transactionId: string | null = null;
				if (total > 0) {
					const [transaction] = await tx.insert(transactions).values({
						memberId,
						locationId: lid,
						description: `${event.name} - ${ticket.name}`,
						type: "inbound",
						status: "paid",
						paymentType,
						paymentMethodId,
						paymentIntentId,
						total,
						subTotal: total,
						currency,
						metadata: {
							eventId,
							ticketId,
							...(chargeId ? { chargeId } : {}),
							...(gatewayService ? { gatewayService } : {}),
							...(gatewayService === "stripe" && chargeId ? { stripeChargeId: chargeId } : {}),
							...(gatewayService === "square" && chargeId ? { squarePaymentId: chargeId } : {}),
						},
					}).returning({ id: transactions.id });
					if (!transaction) return { error: "Unable to create transaction", status: 500 as const };
					transactionId = transaction.id;
				}

				const [registration] = await tx.insert(eventRegistrations).values({ eventId, memberId, ticketId, locationId: lid, transactionId }).returning({ id: eventRegistrations.id, transactionId: eventRegistrations.transactionId });
				if (!registration) return { error: "Unable to create registration", status: 500 as const };
				return registration;
			});

			if ("error" in result) return status(result.status, { error: result.error, ...("code" in result ? { code: result.code } : {}) });
			return status(201, result);
		} catch (error) {
			console.error(error);
			return status(500, { error: "Unable to register member for event" });
		}
	}, {
		body: t.Object({
			memberId: t.String(),
			ticketId: t.String(),
			paymentType: t.Optional(t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("us_bank_account")])),
			paymentMethodId: t.Optional(t.Nullable(t.String())),
		}),
	})
	.patch("/:eventId/registrations/:registrationId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId, registrationId } = params as { lid: string; eventId: string; registrationId: string };
		const [registration] = await db
			.update(eventRegistrations)
			.set({ status: "cancelled", cancelledAt: new Date(), updated: new Date() })
			.where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.locationId, lid)))
			.returning();

		return registration || status(404, { error: "Not found" });
	});
