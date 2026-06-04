import { db } from "@/db/db";
import { slugify } from "@/utils/merchandise";
import { products } from "@subtrees/schemas";
import { and, desc, eq } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

export async function productRoutes(app: Elysia) {
	return app
		.get("/products", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };

			const productList = await db.query.products.findMany({
				where: eq(products.locationId, lid),
				orderBy: [desc(products.created)],
				with: {
					images: true,
					variants: true,
				},
			});

			return status(200, { products: productList });
		})
		.post("/products", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };
			const slug = body.slug?.trim() || slugify(body.name);

			const existing = await db.query.products.findFirst({
				where: and(eq(products.locationId, lid), eq(products.slug, slug)),
				columns: { id: true },
			});

			if (existing) return status(409, { error: "Product slug already exists for this location" });

			const [product] = await db.insert(products).values({
				locationId: lid,
				slug,
				name: body.name,
				category: body.category ?? "merchandise",
				subCategory: body.subCategory ?? "general",
				description: body.description ?? "",
				brand: body.brand ?? null,
				active: body.active ?? true,
			}).returning();

			return status(201, { product });
		}, {
			body: t.Object({
				slug: t.Optional(t.String()),
				name: t.String(),
				category: t.Optional(t.String()),
				subCategory: t.Optional(t.String()),
				description: t.Optional(t.Nullable(t.String())),
				brand: t.Optional(t.Nullable(t.String())),
				active: t.Optional(t.Boolean()),
				metadata: t.Optional(t.Record(t.String(), t.Unknown())),
			}),
		})
		.get("/products/:productId", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, productId } = params as { lid: string; productId: string };

			const product = await db.query.products.findFirst({
				where: and(eq(products.id, productId), eq(products.locationId, lid)),
				with: {
					images: true,
					variants: true,
				},
			});

			if (!product) return status(404, { error: "Product not found" });
			return status(200, { product });
		})
		.patch("/products/:productId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, productId } = params as { lid: string; productId: string };

			const [product] = await db.update(products).set({
				...(body.slug !== undefined ? { slug: body.slug } : {}),
				...(body.name !== undefined ? { name: body.name } : {}),
				...(body.description !== undefined ? { description: body.description ?? "" } : {}),
				...(body.brand !== undefined ? { brand: body.brand } : {}),
				...(body.active !== undefined ? { active: body.active } : {}),
				updated: new Date(),
			}).where(and(eq(products.id, productId), eq(products.locationId, lid))).returning();

			if (!product) return status(404, { error: "Product not found" });
			return status(200, { product });
		}, {
			body: t.Object({
				slug: t.Optional(t.String()),
				name: t.Optional(t.String()),
				description: t.Optional(t.Nullable(t.String())),
				brand: t.Optional(t.Nullable(t.String())),
				active: t.Optional(t.Boolean()),
				metadata: t.Optional(t.Record(t.String(), t.Unknown())),
			}),
		})
		.delete("/products/:productId", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, productId } = params as { lid: string; productId: string };

			const [deleted] = await db.delete(products)
				.where(and(eq(products.id, productId), eq(products.locationId, lid)))
				.returning({ id: products.id });

			if (!deleted) return status(404, { error: "Product not found" });
			return status(200, { success: true });
		});
}
