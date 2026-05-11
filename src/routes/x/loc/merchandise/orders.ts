import { db } from "@/db/db";
import { orders, productImages } from "@subtrees/schemas";
import { and, desc, eq } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

export async function orderRoutes(app: Elysia) {
	return app
		.get("/orders", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };

			const orderList = await db.query.orders.findMany({
				where: eq(orders.locationId, lid),
				orderBy: [desc(orders.created)],
				with: {
					member: true,
					items: {
						with: {
							variant: {
								with: {
									product: {
										with: {
											images: {
												orderBy: [productImages.sortOrder],
											},
										},
									},
								},
							},
						},
					},
				},
			});

			return status(200, { orders: orderList });
		})
		.get("/orders/:orderId", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const order = await db.query.orders.findFirst({
				where: and(eq(orders.id, orderId), eq(orders.locationId, lid)),
				with: {
					member: true,
					items: {
						with: {
							variant: {
								with: {
									product: {
										with: {
											images: {
												orderBy: [productImages.sortOrder],
											},
										},
									},
								},
							},
						},
					},
				},
			});

			if (!order) return status(404, { error: "Order not found" });
			return status(200, { order });
		})
		.patch("/orders/:orderId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const [order] = await db.update(orders).set({
				...(body.status !== undefined ? { status: body.status } : {}),
				...(body.transactionId !== undefined ? { transactionId: body.transactionId } : {}),
				...(body.paymentIntentId !== undefined ? { paymentIntentId: body.paymentIntentId } : {}),
				...(body.shippingAddress !== undefined ? { shippingAddress: body.shippingAddress } : {}),
				...(body.billingAddress !== undefined ? { billingAddress: body.billingAddress } : {}),
				...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
				updated: new Date(),
			}).where(and(eq(orders.id, orderId), eq(orders.locationId, lid))).returning();

			if (!order) return status(404, { error: "Order not found" });
			return status(200, { order });
		}, {
			body: t.Object({
				status: t.Optional(t.Union([
					t.Literal("pending"),
					t.Literal("paid"),
					t.Literal("shipped"),
					t.Literal("delivered"),
					t.Literal("cancelled"),
					t.Literal("refunded"),
				])),
				transactionId: t.Optional(t.Nullable(t.String())),
				paymentIntentId: t.Optional(t.Nullable(t.String())),
				shippingAddress: t.Optional(t.Nullable(t.Record(t.String(), t.Unknown()))),
				billingAddress: t.Optional(t.Nullable(t.Record(t.String(), t.Unknown()))),
				metadata: t.Optional(t.Record(t.String(), t.Unknown())),
			}),
		});
}
