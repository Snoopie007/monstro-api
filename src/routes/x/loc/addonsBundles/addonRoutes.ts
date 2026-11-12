import { Elysia } from "elysia";
import {
	createAddon,
	getAddon,
	getCatalogOptions,
	listAddons,
	updateAddon,
} from "./catalog";
import { addonEditorBody, validateAddonInput } from "./input";
import { getLocationAccess, managePlans, viewPlans } from "./routeAccess";

export const addonRoutes = new Elysia({ prefix: "/addons" })
	.resolve(getLocationAccess)
	.get("/options", async ({ locationId, status }) => {
		return status(200, { options: await getCatalogOptions(locationId) });
	}, { beforeHandle: viewPlans })
	.get("/", async ({ locationId, status }) => {
		return status(200, { addons: await listAddons(locationId) });
	}, { beforeHandle: viewPlans })
	.post("/", async ({ locationId, body, status }) => {
		const options = await getCatalogOptions(locationId);
		const inputError = validateAddonInput(body, options.planPricings);

		if (inputError) return status(400, { error: inputError });

		return status(201, { addon: await createAddon(locationId, body) });
	}, { beforeHandle: managePlans, body: addonEditorBody })
	.get("/:addonId", async ({ locationId, params, status }) => {
		const addon = await getAddon(locationId, params.addonId);

		if (!addon) return status(404, { error: "Add-on not found" });

		return status(200, { addon });
	}, { beforeHandle: viewPlans })
	.patch("/:addonId", async ({ locationId, params, body, status }) => {
		const options = await getCatalogOptions(locationId);
		const inputError = validateAddonInput(body, options.planPricings);

		if (inputError) return status(400, { error: inputError });

		const result = await updateAddon(locationId, params.addonId, body);

		switch (result.status) {
			case "not-found":
				return status(404, { error: "Add-on not found" });
			case "currency-repair-required":
				return status(409, { error: "This legacy add-on uses a different currency. Repair its catalog definition explicitly before editing; existing charges retain their currency." });
			case "archived":
				return status(409, { error: "A purchased add-on cannot be edited after it has been archived" });
			case "updated":
			case "versioned":
				return status(200, { addon: result.addon });
		}
	}, { beforeHandle: managePlans, body: addonEditorBody });
