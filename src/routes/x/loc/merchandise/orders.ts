import { db } from "@/db/db";
import {
	members,
	orders,
	productImages,
	productVariants,
} from "@subtrees/schemas";
import { and, desc, eq } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";
import { adjustStock, capturePayment } from "./shared";

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

export async function orderRoutes(app: Elysia) {
	const itemsWithImages = {
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
	};
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
				},
			});

			if (!order) return status(404, { error: "Order not found" });
			return status(200, { order });
		})
		.post("/orders", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };

			const member = await db.query.members.findFirst({
				where: eq(members.id, body.memberId),
				columns: { id: true },
			});
			if (!member) return status(404, { error: "Member not found" });

			const itemRows: Array<{
				variantId: string;
				quantity: number;
				unitPrice: number;
				productSnapshot: Record<string, unknown>;
			}> = [];
			let subtotal = 0;

			for (const item of body.items) {
				const variant = await db.query.productVariants.findFirst({
					where: and(eq(productVariants.id, item.variantId), eq(productVariants.active, true)),
					with: {
						product: {
							columns: { id: true, name: true, slug: true },
							with: {
								images: {
									orderBy: [productImages.sortOrder],
									limit: 1,
								},
							},
						},
					},
				});

				if (!variant) {
					return status(404, { error: `Variant ${item.variantId} not found or inactive` });
				}

				if (typeof variant.stock === "number" && variant.stock < item.quantity) {
					return status(409, { error: `Insufficient stock for variant ${variant.sku}` });
				}

				const unitPrice = variant.price;
				subtotal += unitPrice * item.quantity;

				itemRows.push({
					variantId: item.variantId,
					quantity: item.quantity,
					unitPrice,
					productSnapshot: {
						productName: variant.product?.name ?? "",
						productSlug: variant.product?.slug ?? "",
						sku: variant.sku,
						color: variant.color,
						size: variant.size,
						imageUrl: variant.product?.images?.[0]?.imageUrl ?? null,
					},
				});
			}


			const tax = body.tax ?? 0;
			const shipping = body.shipping ?? 0;
			const total = subtotal + shipping + tax;
			const currency = body.currency ?? "USD";

			const [order] = await db.insert(orders).values({
				locationId: lid,
				memberId: body.memberId,
				status: "pending",
				subtotal,
				shipping,
				items: itemRows,
				tax,
				total,
				currency,
				metadata: body.notes ? { notes: body.notes } : {},
			}).returning();

			if (!order) return status(500, { error: "Failed to create order" });


			await adjustStock(order.id, -1);

			if (body.capturePayment && body.paymentMethodId) {
				await capturePayment(order.id, lid, body.memberId, body.paymentMethodId, subtotal, shipping, tax, total, currency);
			}

			const createdOrder = await db.query.orders.findFirst({
				where: eq(orders.id, order.id),
				with: {
					member: true,
				},
			});

			return status(201, { order: createdOrder });
		}, {
			body: t.Object({
				memberId: t.String(),
				items: t.Array(t.Object({
					variantId: t.String(),
					quantity: t.Number(),
				})),
				currency: t.Optional(t.String()),
				shipping: t.Optional(t.Number()),
				tax: t.Optional(t.Number()),
				notes: t.Optional(t.String()),
				capturePayment: t.Optional(t.Boolean()),
				paymentMethodId: t.Optional(t.String()),
			}),
		})
		.post("/orders/:orderId/capture", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const order = await db.query.orders.findFirst({
				where: and(eq(orders.id, orderId), eq(orders.locationId, lid)),
				columns: { id: true, status: true, memberId: true, subtotal: true, shipping: true, tax: true, total: true, currency: true },
			});

			if (!order) return status(404, { error: "Order not found" });
			if (order.status !== "pending") return status(409, { error: "Order is not pending" });

			if (body.paymentMethodId) {
				await capturePayment(
					order.id, lid, order.memberId, body.paymentMethodId,
					order.subtotal, order.shipping, order.tax, order.total, "USD"
				);
			} else {
				await db.update(orders).set({ status: "paid", updated: new Date() })
					.where(and(eq(orders.id, orderId), eq(orders.locationId, lid)));
			}

			const updatedOrder = await db.query.orders.findFirst({
				where: and(eq(orders.id, orderId), eq(orders.locationId, lid)),
				with: {
					member: true,
				},
			});

			return status(200, { order: updatedOrder });
		}, {
			body: t.Object({
				paymentMethodId: t.Optional(t.String()),
			}),
		})
		.patch("/orders/:orderId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const restoringStock = body.status === "cancelled" || body.status === "refunded";

			const [order] = await db.update(orders).set({
				...(body.status !== undefined ? { status: body.status } : {}),
				...(body.paymentIntentId !== undefined ? { paymentIntentId: body.paymentIntentId } : {}),
				...(body.shippingAddress !== undefined ? { shippingAddress: body.shippingAddress } : {}),
				...(body.billingAddress !== undefined ? { billingAddress: body.billingAddress } : {}),
				...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
				updated: new Date(),
			}).where(and(eq(orders.id, orderId), eq(orders.locationId, lid))).returning();

			if (!order) return status(404, { error: "Order not found" });

			if (restoringStock) {
				await adjustStock(orderId, 1);
			}
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
