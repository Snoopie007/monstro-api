import { canAccessLocation } from "@/utils/merchandise";
import { Elysia, type Context } from "elysia";
import {
	archiveAddon,
	archiveBundle,
	createAddon,
	createBundle,
	getAddon,
	getBundle,
	getCatalogOptions,
	listAddons,
	listBundles,
	updateAddon,
	updateBundle,
} from "./catalog";
import {
	addonEditorBody,
	bundleEditorBody,
	validateAddonEditorInput,
	validateBundleEditorInput,
} from "./input";

type XAuthContext = Context & { vendorId?: string; staffId?: string };
type CatalogAccessContext = { addonBundleLocationAccess: { allowed: boolean } };

function forbidden(status: Context["status"]) {
	return status(403, { error: "Forbidden", code: "FORBIDDEN" });
}

export const xAddonsBundles = new Elysia({ prefix: "/addons-bundles" })
	.resolve(async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		return { addonBundleLocationAccess: await canAccessLocation(lid, vendorId, staffId) };
	})
	.get("/options", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid } = params as { lid: string };
		return status(200, { options: await getCatalogOptions(lid) });
	})
	.get("/addons", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid } = params as { lid: string };
		return status(200, { addons: await listAddons(lid) });
	})
	.post("/addons", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid } = params as { lid: string };
		const options = await getCatalogOptions(lid);
		const inputError = validateAddonEditorInput(body, options.planPricings);
		if (inputError) return status(400, { error: inputError });
		return status(201, { addon: await createAddon(lid, body) });
	}, { body: addonEditorBody })
	.get("/addons/:addonId", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, addonId } = params as { lid: string; addonId: string };
		const addon = await getAddon(lid, addonId);
		if (!addon) return status(404, { error: "Add-on not found" });
		return status(200, { addon });
	})
	.patch("/addons/:addonId", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, addonId } = params as { lid: string; addonId: string };
		const options = await getCatalogOptions(lid);
		const inputError = validateAddonEditorInput(body, options.planPricings);
		if (inputError) return status(400, { error: inputError });
		const result = await updateAddon(lid, addonId, body);
		if (result.status === "not-found") return status(404, { error: "Add-on not found" });
		if (result.status === "archived") {
			return status(409, { error: "A purchased add-on cannot be edited after it has been archived" });
		}
		return status(200, { addon: result.addon });
	}, { body: addonEditorBody })
	.post("/addons/:addonId/archive", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, addonId } = params as { lid: string; addonId: string };
		const addon = await archiveAddon(lid, addonId);
		if (!addon) return status(404, { error: "Add-on not found" });
		return status(200, { addon });
	})
	.get("/bundles", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid } = params as { lid: string };
		return status(200, { bundles: await listBundles(lid) });
	})
	.post("/bundles", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid } = params as { lid: string };
		const options = await getCatalogOptions(lid);
		const inputError = validateBundleEditorInput(body, options);
		if (inputError) return status(400, { error: inputError });
		return status(201, { bundle: await createBundle(lid, body) });
	}, { body: bundleEditorBody })
	.get("/bundles/:bundleId", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, bundleId } = params as { lid: string; bundleId: string };
		const bundle = await getBundle(lid, bundleId);
		if (!bundle) return status(404, { error: "Bundle not found" });
		return status(200, { bundle });
	})
	.patch("/bundles/:bundleId", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, bundleId } = params as { lid: string; bundleId: string };
		const options = await getCatalogOptions(lid);
		const inputError = validateBundleEditorInput(body, options);
		if (inputError) return status(400, { error: inputError });
		const result = await updateBundle(lid, bundleId, body);
		if (result.status === "not-found") return status(404, { error: "Bundle not found" });
		if (result.status === "archived") {
			return status(409, { error: "A purchased bundle cannot be edited after it has been archived" });
		}
		return status(200, { bundle: result.bundle });
	}, { body: bundleEditorBody })
	.post("/bundles/:bundleId/archive", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, bundleId } = params as { lid: string; bundleId: string };
		const bundle = await archiveBundle(lid, bundleId);
		if (!bundle) return status(404, { error: "Bundle not found" });
		return status(200, { bundle });
	});
