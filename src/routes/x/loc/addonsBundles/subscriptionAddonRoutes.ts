import { enqueueSubscriptionAddonJob } from "@/queues/subscriptionAddons";
import { Elysia, t } from "elysia";
import { activateBundlePurchase, cancelBundlePurchase } from "./bundlePurchases";
import { resolveLocationAccess, resolveMemberBillingAccess } from "./routeAccess";
import {
	cancelSubscriptionAddon,
	getSubscriptionAddonOverview,
	getSubscriptionAddonPurchase,
	getSubscriptionAddonRenewal,
	purchaseSubscriptionAddon,
} from "./subscriptionAddons";

export const subscriptionAddonRoutes = new Elysia({ prefix: "/subscriptions/:sid/addons" })
	.resolve(resolveLocationAccess)
	.get("/", async ({ locationId, params, status }) => {
		const subscriptionAddons = await getSubscriptionAddonOverview(locationId, params.sid);

		if (!subscriptionAddons) return status(404, { error: "Subscription not found" });

		return status(200, { subscriptionAddons });
	})
	.guard({}, (mutations) => mutations
	.onBeforeHandle(resolveMemberBillingAccess)
	.post("/", async ({ locationId, params, body, status }) => {
		const result = await purchaseSubscriptionAddon(locationId, params.sid, body.addonId);

		switch (result.status) {
			case "subscription-not-found":
				return status(404, { error: "Subscription not found" });
			case "subscription-inactive":
				return status(409, { error: "Add-ons can only be added to an active subscription" });
			case "addon-not-found":
				return status(404, { error: "Add-on not found" });
			case "pricing-conflict":
				return status(409, { error: "This subscription already has a different add-on price" });
		}

		await enqueueSubscriptionAddonJob("activate", result.purchaseId);
		const purchase = await getSubscriptionAddonPurchase(locationId, params.sid, result.purchaseId);

		if (!purchase) throw new Error("Subscription add-on purchase was not found after creation");

		return status(result.status === "created" ? 202 : 200, { purchase });
	}, { body: t.Object({ addonId: t.String({ minLength: 1 }) }) })
	.post("/:purchaseId/cancel", async ({ locationId, params, status }) => {
		const result = await cancelSubscriptionAddon(locationId, params.purchaseId, params.sid);

		if (result.status === "not-found") return status(404, { error: "Subscription add-on not found" });

		if (result.status === "bundle-cancel-required") {
			const bundleResult = await cancelBundlePurchase(
				locationId,
				result.bundlePurchaseId,
				"Required bundled add-on was canceled",
			);

			if (bundleResult.status === "not-found") return status(404, { error: "Bundle purchase not found" });

			return status(200, { canceled: true, bundleCanceled: true, cancelAt: null });
		}

		if (result.runAt) await enqueueSubscriptionAddonJob("cancel", params.purchaseId, result.runAt);

		return status(200, { canceled: true, cancelAt: result.runAt?.toISOString() ?? null });
	})
	.post("/:purchaseId/renewal", async ({ locationId, params, status }) => {
		const renewal = await getSubscriptionAddonRenewal(locationId, params.purchaseId, params.sid);

		if (!renewal) return status(404, { error: "Subscription add-on not found" });

		// A paid cash add-on can complete its pending bundle.
		if (renewal.bundlePurchaseId) {
			const bundleActivation = await activateBundlePurchase(locationId, renewal.bundlePurchaseId);

			if (bundleActivation.status === "pricing-conflict") {
				return status(409, { error: "Bundled add-ons would apply conflicting subscription prices" });
			}

			if (bundleActivation.status === "ready") {
				await Promise.all(bundleActivation.addonPurchaseIds.map((addonPurchaseId) =>
					enqueueSubscriptionAddonJob("activate", addonPurchaseId)
				));
			}
		}

		if (renewal.runAt) await enqueueSubscriptionAddonJob("renew", params.purchaseId, renewal.runAt);

		return status(200, { scheduled: Boolean(renewal.runAt), runAt: renewal.runAt?.toISOString() ?? null });
	}));
