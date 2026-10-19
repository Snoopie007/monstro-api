import { enqueueAddonJob } from "@/queues/subscriptionAddons";
import { Elysia, t } from "elysia";
import { cancelBundle } from "@/handlers/addonsBundles/cancellation";
import { reconcileBundle } from "@/handlers/addonsBundles/checkout/settlement";
import { getLocationAccess, getBillingAccess } from "./routeAccess";
import {
	cancelAddon,
	getAddonOverview,
	getAddonPurchase,
	getAddonRenewal,
	purchaseAddon,
} from "./subscriptionAddons";

export const subscriptionAddonRoutes = new Elysia({ prefix: "/subscriptions/:sid/addons" })
	.resolve(getLocationAccess)
	.get("/", async ({ locationId, params, status }) => {
		const subscriptionAddons = await getAddonOverview(locationId, params.sid);

		if (!subscriptionAddons) return status(404, { error: "Subscription not found" });

		return status(200, { subscriptionAddons });
	})
	.guard({}, (mutations) => mutations
	.onBeforeHandle(getBillingAccess)
	.post("/", async ({ locationId, params, body, status }) => {
		const result = await purchaseAddon(locationId, params.sid, body.addonId);

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

		await enqueueAddonJob("activate", result.purchaseId);
		const purchase = await getAddonPurchase(locationId, params.sid, result.purchaseId);

		if (!purchase) throw new Error("Subscription add-on purchase was not found after creation");

		return status(result.status === "created" ? 202 : 200, { purchase });
	}, { body: t.Object({ addonId: t.String({ minLength: 1 }) }) })
	.post("/:purchaseId/cancel", async ({ locationId, params, status }) => {
		const result = await cancelAddon(locationId, params.purchaseId, params.sid);

		if (result.status === "not-found") return status(404, { error: "Subscription add-on not found" });

		if (result.status === "bundle-cancel-required") {
			const bundleResult = await cancelBundle(
				locationId,
				result.bundlePurchaseId,
				"Required bundled add-on was canceled",
			);

			if (bundleResult.status === "not-found") return status(404, { error: "Bundle purchase not found" });

			return status(200, { canceled: true, bundleCanceled: true, cancelAt: null });
		}

		if (result.runAt) await enqueueAddonJob("cancel", params.purchaseId, result.runAt);

		return status(200, { canceled: true, cancelAt: result.runAt?.toISOString() ?? null });
	})
	.post("/:purchaseId/renewal", async ({ locationId, params, status }) => {
		const renewal = await getAddonRenewal(locationId, params.purchaseId, params.sid);

		if (!renewal) return status(404, { error: "Subscription add-on not found" });

		// A paid cash add-on can complete its pending bundle.
		if (renewal.bundlePurchaseId) {
			const bundleActivation = await reconcileBundle(locationId, renewal.bundlePurchaseId);

			if (bundleActivation.status === "pricing-conflict") {
				return status(409, { error: "Bundled add-ons would apply conflicting subscription prices" });
			}
		}

		if (renewal.runAt) await enqueueAddonJob("renew", params.purchaseId, renewal.runAt);

		return status(200, { scheduled: Boolean(renewal.runAt), runAt: renewal.runAt?.toISOString() ?? null });
	}));
