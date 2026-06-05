import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { ALLOWED_IMAGE_TYPES } from "@subtrees/constants/data";
import { productImages, products } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import type Elysia from "elysia";
import { t } from "elysia";

const s3 = new S3Bucket();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type MerchandiseAccessContext = {
	merchandiseLocationAccess: { allowed: boolean };
};

export async function imageRoutes(app: Elysia) {
	return app
		.post("/images/presigned", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };
			const { productId, file } = body;

			if (!file.name || !file.type || file.size <= 0) {
				return status(400, { error: "Invalid file" });
			}

			if (file.size > MAX_FILE_SIZE) {
				return status(400, { error: "File exceeds 10MB limit" });
			}

			if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
				return status(400, { error: "Unsupported image type" });
			}

			const product = await db.query.products.findFirst({
				where: and(eq(products.id, productId), eq(products.locationId, lid)),
				columns: { id: true },
			});

			if (!product) return status(404, { error: "Product not found" });

			const { uploadUrl, publicUrl } = await s3.getPresignedUploadUrl(
				`products/${productId}`,
				file.name,
				file.type
			);

			return status(200, { uploadUrl, publicUrl });
		}, {
			body: t.Object({
				productId: t.String(),
				file: t.Object({
					name: t.String(),
					type: t.String(),
					size: t.Number(),
				}),
			}),
		})
		.post("/images", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid } = params as { lid: string };
			const { productId, imageUrl, sortOrder } = body;

			const product = await db.query.products.findFirst({
				where: and(eq(products.id, productId), eq(products.locationId, lid)),
				columns: { id: true },
			});

			if (!product) return status(404, { error: "Product not found" });

			const [image] = await db.insert(productImages).values({
				productId,
				imageUrl,
				sortOrder: sortOrder ?? 0,
			}).returning();

			return status(201, { image });
		}, {
			body: t.Object({
				productId: t.String(),
				imageUrl: t.String(),
				altText: t.Optional(t.Nullable(t.String())),
				sortOrder: t.Optional(t.Number()),
			}),
		})
		.patch("/images/:imageId", async (ctx) => {
			const { params, body, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, imageId } = params as { lid: string; imageId: string };

			const existing = await db.query.productImages.findFirst({
				where: eq(productImages.id, imageId),
				with: { product: { columns: { locationId: true } } },
			});

			if (!existing || existing.product.locationId !== lid) {
				return status(404, { error: "Image not found" });
			}

			const [image] = await db.update(productImages).set({
				...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
			}).where(eq(productImages.id, imageId)).returning();

			return status(200, { image });
		}, {
			body: t.Object({
				altText: t.Optional(t.Nullable(t.String())),
				sortOrder: t.Optional(t.Number()),
			}),
		})
		.delete("/images/:imageId", async (ctx) => {
			const { params, status, merchandiseLocationAccess } = ctx as typeof ctx & MerchandiseAccessContext;
			if (!merchandiseLocationAccess.allowed) return status(403, { error: "Location access denied" });
			const { lid, imageId } = params as { lid: string; imageId: string };

			const existing = await db.query.productImages.findFirst({
				where: eq(productImages.id, imageId),
				with: { product: { columns: { locationId: true, id: true } } },
			});

			if (!existing || existing.product.locationId !== lid) {
				return status(404, { error: "Image not found" });
			}

			const filename = existing.imageUrl.split("/").pop();
			if (filename) {
				await s3.removeFile(`products/${existing.product.id}`, filename);
			}

			await db.delete(productImages).where(eq(productImages.id, imageId));

			return status(200, { success: true });
		});
}
