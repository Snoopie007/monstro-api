import { db } from "@/db/db";
import { products, productVariants } from "@subtrees/schemas";
import { and, desc, eq, inArray } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";
import type { ProductSize } from "@subtrees/types";

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

export async function merchandiseRoutes(app: Elysia) {
	return app
		.get("/variants", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };
			const locationProductIds = db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.locationId, lid));

			const variants = await db.query.productVariants.findMany({
				where: inArray(productVariants.productId, locationProductIds),
				with: {
					product: true,
				},
				orderBy: [desc(productVariants.created)],
			});

			return status(200, { variants });
		})
		.post("/variants", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };

			const product = await db.query.products.findFirst({
				where: and(eq(products.id, body.productId), eq(products.locationId, lid)),
				columns: { id: true },
			});

			if (!product) return status(404, { error: "Product not found" });

			const [variant] = await db.insert(productVariants).values({
				productId: body.productId,
				sku: body.sku,
				color: body.color ?? null,
				size: (body.size ?? null) as ProductSize | null,
				price: body.price,
				stock: body.stock ?? 0,
				active: body.active ?? true,
			}).returning();

			return status(201, { variant });
		}, {
			body: t.Object({
				productId: t.String(),
				sku: t.String(),
				color: t.Optional(t.Nullable(t.String())),
				size: t.Optional(t.Nullable(t.String())),
				price: t.Number({ minimum: 0 }),
				stock: t.Optional(t.Number({ minimum: 0 })),
				active: t.Optional(t.Boolean()),
				metadata: t.Optional(t.Record(t.String(), t.Unknown())),
			}),
		})
		.patch("/variants/:variantId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, variantId } = params as { lid: string; variantId: string };
			const locationProductIds = db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.locationId, lid));

			const [updated] = await db.update(productVariants).set({
				...(body.sku !== undefined ? { sku: body.sku } : {}),
				...(body.color !== undefined ? { color: body.color } : {}),
				...(body.size !== undefined ? { size: body.size as ProductSize | null } : {}),
				...(body.price !== undefined ? { price: body.price } : {}),
				...(body.stock !== undefined ? { stock: body.stock } : {}),
				...(body.active !== undefined ? { active: body.active } : {}),
				updated: new Date(),
			}).where(and(
				eq(productVariants.id, variantId),
				inArray(productVariants.productId, locationProductIds)
			)).returning();

			if (!updated) return status(404, { error: "Variant not found" });
			return status(200, { variant: updated });
		}, {
			body: t.Object({
				sku: t.Optional(t.String()),
				color: t.Optional(t.Nullable(t.String())),
				size: t.Optional(t.Nullable(t.String())),
				price: t.Optional(t.Number({ minimum: 0 })),
				stock: t.Optional(t.Number({ minimum: 0 })),
				active: t.Optional(t.Boolean()),
				metadata: t.Optional(t.Record(t.String(), t.Unknown())),
			}),
		})
		.delete("/variants/:variantId", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, variantId } = params as { lid: string; variantId: string };
			const locationProductIds = db
				.select({ id: products.id })
				.from(products)
				.where(eq(products.locationId, lid));
			const [deleted] = await db.delete(productVariants)
				.where(and(
					eq(productVariants.id, variantId),
					inArray(productVariants.productId, locationProductIds)
				))
				.returning({ id: productVariants.id });

			if (!deleted) return status(404, { error: "Variant not found" });
			return status(200, { success: true });
		});
}
