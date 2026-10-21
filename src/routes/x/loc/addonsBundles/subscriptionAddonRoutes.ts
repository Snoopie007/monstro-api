import { enqueueAddonJob } from "@/queues/subscriptionAddons";
import { Elysia, t } from "elysia";
import { addAddon } from "./addAddon";
import { cancelBundle } from "@/handlers/addonsBundles/cancellation";
import { getLocationAccess, getBillingAccess } from "./routeAccess";
import { cancelAddon, getAddonOverview } from "./subscriptionAddons";

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
		const result = await addAddon(locationId, params.sid, body.addonId);

		if (result.status === "rejected") return status(result.code, { error: result.error });

		return status(result.status === "created" ? 202 : 200, { purchase: result.purchase });
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
	}));
