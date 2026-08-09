import { canAccessLocation } from "@/utils/merchandise";
import { enqueueSubscriptionAddonJob } from "@/queues";
import { Elysia, t, type Context } from "elysia";
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
	activateBundlePurchase,
	cancelBundlePurchase,
	purchaseBundle,
} from "./bundlePurchases";
import {
	addonEditorBody,
	bundleEditorBody,
	validateAddonEditorInput,
	validateBundleEditorInput,
} from "./input";
import {
	cancelSubscriptionAddon,
	getSubscriptionAddonOverview,
	getSubscriptionAddonPurchase,
	getSubscriptionAddonRenewal,
	purchaseSubscriptionAddon,
} from "./subscriptionAddons";

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
	.get("/subscriptions/:subscriptionId/addons", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, subscriptionId } = params as { lid: string; subscriptionId: string };
		const subscriptionAddons = await getSubscriptionAddonOverview(lid, subscriptionId);
		if (!subscriptionAddons) return status(404, { error: "Subscription not found" });
		return status(200, { subscriptionAddons });
	})
	.post("/subscriptions/:subscriptionId/addons", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, subscriptionId } = params as { lid: string; subscriptionId: string };
		const { addonId } = body as { addonId: string };
		const result = await purchaseSubscriptionAddon(lid, subscriptionId, addonId);
		if (result.status === "subscription-not-found") return status(404, { error: "Subscription not found" });
		if (result.status === "subscription-inactive") {
			return status(409, { error: "Add-ons can only be added to an active subscription" });
		}
		if (result.status === "addon-not-found") return status(404, { error: "Add-on not found" });
		if (result.status === "pricing-conflict") {
			return status(409, { error: "This subscription already has a different add-on price" });
		}

		await enqueueSubscriptionAddonJob("activate", result.purchaseId);
		const purchase = await getSubscriptionAddonPurchase(lid, subscriptionId, result.purchaseId);
		if (!purchase) throw new Error("Subscription add-on purchase was not found after creation");
		return status(result.status === "created" ? 202 : 200, { purchase });
	}, { body: t.Object({ addonId: t.String({ minLength: 1 }) }) })
	.post("/subscription-addons/:purchaseId/cancel", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, purchaseId } = params as { lid: string; purchaseId: string };
		const result = await cancelSubscriptionAddon(lid, purchaseId);
		if (result.status === "not-found") return status(404, { error: "Subscription add-on not found" });
		if (result.status === "bundle-cancel-required") {
			const bundleResult = await cancelBundlePurchase(
				lid,
				result.bundlePurchaseId,
				"Required bundled add-on was canceled",
			);
			if (bundleResult.status === "not-found") return status(404, { error: "Bundle purchase not found" });
			return status(200, { canceled: true, bundleCanceled: true, cancelAt: null });
		}
		if (result.runAt) await enqueueSubscriptionAddonJob("cancel", purchaseId, result.runAt);
		return status(200, { canceled: true, cancelAt: result.runAt?.toISOString() ?? null });
	})
	.post("/subscription-addons/:purchaseId/schedule-renewal", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, purchaseId } = params as { lid: string; purchaseId: string };
		const renewal = await getSubscriptionAddonRenewal(lid, purchaseId);
		if (!renewal) return status(404, { error: "Subscription add-on not found" });
		if (renewal.bundlePurchaseId) {
			const bundleActivation = await activateBundlePurchase(lid, renewal.bundlePurchaseId);
			if (bundleActivation.status === "pricing-conflict") {
				return status(409, { error: "Bundled add-ons would apply conflicting subscription prices" });
			}
			if (bundleActivation.status === "ready") {
				await Promise.all(bundleActivation.addonPurchaseIds.map((addonPurchaseId) =>
					enqueueSubscriptionAddonJob("activate", addonPurchaseId)
				));
			}
		}
		if (renewal.runAt) await enqueueSubscriptionAddonJob("renew", purchaseId, renewal.runAt);
		return status(200, { scheduled: Boolean(renewal.runAt), runAt: renewal.runAt?.toISOString() ?? null });
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
	})
	.post("/members/:memberId/bundle-purchases", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, memberId } = params as { lid: string; memberId: string };
		if (body.paymentType !== "cash" && !body.paymentMethodId) {
			return status(400, { error: "Choose a payment method for this bundle" });
		}
		const result = await purchaseBundle(lid, memberId, body);
		if (result.status !== "created") {
			const statusCode = result.status === "invalid-components"
				? 400
				: result.status === "pricing-conflict" ? 409 : 404;
			return status(statusCode, { error: result.error });
		}
		return status(201, result.value);
	}, {
		body: t.Object({
			bundleId: t.String({ minLength: 1 }),
			paymentType: t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("us_bank_account")]),
			paymentMethodId: t.Optional(t.String({ minLength: 1 })),
			startDate: t.Optional(t.String({ minLength: 1 })),
			selectedOptionalComponentIds: t.Array(t.String({ minLength: 1 })),
		}),
	})
	.post("/bundle-purchases/:bundlePurchaseId/activate", async (ctx) => {
		const { params, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, bundlePurchaseId } = params as { lid: string; bundlePurchaseId: string };
		const result = await activateBundlePurchase(lid, bundlePurchaseId);
		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });
		if (result.status === "inactive") return status(409, { error: "Bundle purchase is no longer active" });
		if (result.status === "subscriptions-not-ready") {
			return status(202, {
				activated: false,
				pending: true,
				addonPurchaseIds: [],
			});
		}
		if (result.status === "pricing-conflict") {
			return status(409, { error: "Bundled add-ons would apply conflicting subscription prices" });
		}
		await Promise.all(result.addonPurchaseIds.map((purchaseId) =>
			enqueueSubscriptionAddonJob("activate", purchaseId)
		));
		return status(202, { activated: result.addonPurchaseIds.length === 0, addonPurchaseIds: result.addonPurchaseIds });
	})
	.post("/bundle-purchases/:bundlePurchaseId/cancel", async (ctx) => {
		const { params, body, status, addonBundleLocationAccess } = ctx as typeof ctx & CatalogAccessContext;
		if (!addonBundleLocationAccess.allowed) return forbidden(status);
		const { lid, bundlePurchaseId } = params as { lid: string; bundlePurchaseId: string };
		const result = await cancelBundlePurchase(lid, bundlePurchaseId, body.reason);
		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });
		return status(200, { canceled: true });
	}, { body: t.Object({ reason: t.Optional(t.String()) }) });
