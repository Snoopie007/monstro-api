import { db } from "@/db/db";
import {
	members,
	orders,
	productImages,
	productVariants,
} from "@subtrees/schemas";
import { and, desc, eq, inArray } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";
import { adjustStock, markOrderPaid } from "./shared";
import type { OrderLineItem } from "@subtrees/types";

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

type OrderLineItemDisplay = OrderLineItem & {
	sku: string | null;
	imageUrl: string | null;
};

async function attachLineItemDisplayData<T extends { items: OrderLineItem[] | null }>(
	order: T,
): Promise<Omit<T, "items"> & { items: OrderLineItemDisplay[] }> {
	const items = order.items ?? [];
	if (items.length === 0) return { ...order, items: [] };

	const variantIds: string[] = [];
	const seenVariantIds = new Set<string>();
	for (const item of items) {
		if (!seenVariantIds.has(item.variantId)) {
			seenVariantIds.add(item.variantId);
			variantIds.push(item.variantId);
		}
	}

	const variants = await db.query.productVariants.findMany({
		where: inArray(productVariants.id, variantIds),
		columns: { id: true, sku: true },
		with: {
			product: {
				columns: { name: true },
				with: {
					images: {
						columns: { imageUrl: true },
						orderBy: [productImages.sortOrder],
						limit: 1,
					},
				},
			},
		},
	});

	const variantById = new Map(variants.map((variant) => [variant.id, variant]));

	return {
		...order,
		items: items.map((item) => {
			const variant = variantById.get(item.variantId);
			return {
				...item,
				productName: item.productName || variant?.product?.name || "",
				sku: variant?.sku ?? null,
				imageUrl: variant?.product?.images?.[0]?.imageUrl ?? null,
			};
		}),
	};
}

export async function orderRoutes(app: Elysia) {
	return app
		.get("/orders", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };

			const orderList = await db.query.orders.findMany({
				where: eq(orders.locationId, lid),
				columns: {
					id: true,
					status: true,
					total: true,
					created: true,
				},
				orderBy: [desc(orders.created)],
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
					member: {
						columns: {
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
						},
					},
				},
			});

			if (!order) return status(404, { error: "Order not found" });
			return status(200, { order: await attachLineItemDisplayData(order) });
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
			if (body.items.length === 0) return status(400, { error: "At least one item is required" });

			const variantIds: string[] = [];
			const seenVariantIds = new Set<string>();
			for (const item of body.items) {
				if (!seenVariantIds.has(item.variantId)) {
					seenVariantIds.add(item.variantId);
					variantIds.push(item.variantId);
				}
			}

			const variants = await db.query.productVariants.findMany({
				where: and(inArray(productVariants.id, variantIds), eq(productVariants.active, true)),
				columns: { id: true, stock: true, sku: true, price: true },
				with: {
					product: {
						columns: { name: true },
					},
				},
			});
			const variantById = new Map(variants.map((variant) => [variant.id, variant]));

			const itemRows: OrderLineItem[] = [];
			let subtotal = 0;

			for (const item of body.items) {
				const variant = variantById.get(item.variantId);

				if (!variant) {
					return status(404, { error: `Variant ${item.variantId} not found or inactive` });
				}

				if (typeof variant.stock === "number" && variant.stock < item.quantity) {
					return status(409, { error: `Insufficient stock for variant ${variant.sku}` });
				}

				subtotal += variant.price * item.quantity;

				itemRows.push({
					variantId: item.variantId,
					quantity: item.quantity,
					unitCost: variant.price,
					productName: variant.product?.name ?? "",
					tax: 0,
				});
			}

			const tax = body.tax ?? 0;
			const shipping = body.shipping ?? 0;
			const total = subtotal + shipping + tax;

			const [order] = await db.insert(orders).values({
				locationId: lid,
				memberId: body.memberId,
				trackingNumber: Math.floor(1000000000 + Math.random() * 9000000000),
				status: "pending",
				subtotal,
				shipping,
				tax,
				total,
				items: itemRows,
				processingFee: 0,
			}).returning();

			if (!order) return status(500, { error: "Failed to create order" });

			await adjustStock(order.id, -1);


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
				shipping: t.Optional(t.Number()),
				tax: t.Optional(t.Number()),
			}),
		})
		.post("/orders/:orderId/capture", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const order = await db.query.orders.findFirst({
				where: and(eq(orders.id, orderId), eq(orders.locationId, lid)),
				columns: { id: true, status: true },
			});

			if (!order) return status(404, { error: "Order not found" });
			if (order.status !== "pending") return status(409, { error: "Order is not pending" });
			await markOrderPaid(order.id);

			const updatedOrder = await db.query.orders.findFirst({
				where: and(eq(orders.id, orderId), eq(orders.locationId, lid)),
				with: {
					member: true,
				},
			});

			return status(200, { order: updatedOrder });
		}, {
			body: t.Object({}),
		})
		.patch("/orders/:orderId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, orderId } = params as { lid: string; orderId: string };

			const restoringStock = body.status === "cancelled" || body.status === "refunded";

			const [order] = await db.update(orders).set({
				...(body.status !== undefined ? { status: body.status } : {}),
				...(body.gatewayPaymentId !== undefined ? { gatewayPaymentId: body.gatewayPaymentId } : {}),
				...(body.shippingAddress !== undefined ? { shippingAddress: body.shippingAddress as any } : {}),
				...(body.billingAddress !== undefined ? { billingAddress: body.billingAddress as any } : {}),
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
				gatewayPaymentId: t.Optional(t.Nullable(t.String())),
				shippingAddress: t.Optional(t.Nullable(t.Record(t.String(), t.Unknown()))),
				billingAddress: t.Optional(t.Nullable(t.Record(t.String(), t.Unknown()))),
			}),
		});
}
