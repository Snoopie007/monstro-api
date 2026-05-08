import { canAccessLocation } from "@/utils/merchandise";
import { Elysia, type Context } from "elysia";
import { merchandiseRoutes } from "./merchandise";
import { orderRoutes } from "./orders";
import { productRoutes } from "./products";

type XAuthContext = Context & { vendorId?: string; staffId?: string };

export const xMerchandise = new Elysia({ prefix: "/merchandise" })
	.resolve(async (ctx) => {
		// Check for location access on all routes
		const { lid } = ctx.params as { lid: string };
		// Check for vendor AND staff access
		const { vendorId, staffId } = ctx as XAuthContext;
		return { merchandiseLocationAccess: await canAccessLocation(lid, vendorId, staffId) };
	})
	.use(productRoutes)
	.use(merchandiseRoutes)
	.use(orderRoutes);
