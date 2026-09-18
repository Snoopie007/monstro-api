import { canAccessLocation } from "@/utils/merchandise";
import { Elysia, type Context } from "elysia";
import { xGoogleAdsCampaign } from "./campaign";
import { xGoogleAdsConquest } from "./conquest";
import { xGoogleAdsBrand } from "./brand";
import { xGoogleAdsSetup } from "./setup";

type XAuthContext = Context & { vendorId?: string; staffId?: string };

export const xGoogleAds = new Elysia({ prefix: "/ads/google" })
	.resolve(async (ctx) => {
		const { params, status } = ctx;
		const { lid } = params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		const access = await canAccessLocation(lid, vendorId, staffId);
		if (!access.allowed) return status(403, { error: "Location access denied" });
		return {
			locationAccess: access,
		};
	})
	.use(xGoogleAdsCampaign)
	.use(xGoogleAdsSetup)
	.use(xGoogleAdsBrand)
	.use(xGoogleAdsConquest);
