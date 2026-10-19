import { Elysia, t } from "elysia";
import { cancelBundle } from "@/handlers/addonsBundles/cancellation";
import { prepareBundle, type BundlePurchaseErrorStatus } from "@/handlers/addonsBundles/checkout/prepare";
import { payBundle } from "@/handlers/addonsBundles/checkout/pay";
import { refundBundle } from "@/handlers/addonsBundles/refund/chargeRefund";
import {
	createBundle,
	getBundle,
	getCatalogOptions,
	listBundles,
	updateBundle,
} from "./catalog";
import { bundleEditorBody, validateBundleInput } from "./input";
import { getLocationAccess, getBillingAccess } from "./routeAccess";

// The HTTP status for each reason a purchase can't be prepared.
const purchaseErrorCodes = {
	"member-not-found": 404, "bundle-not-found": 404, "invalid-components": 400,
	"payment-unavailable": 400, "intent-conflict": 409, "pricing-conflict": 409,
} as const satisfies Record<BundlePurchaseErrorStatus, number>;

export const bundleRoutes = new Elysia({ prefix: "/bundles" })
	.resolve(getLocationAccess)
	.get("/", async ({ locationId, status }) => {
		return status(200, { bundles: await listBundles(locationId) });
	})
	.post("/", async ({ locationId, body, status }) => {
		const options = await getCatalogOptions(locationId);
		const inputError = validateBundleInput(body, options);

		if (inputError) return status(400, { error: inputError });

		return status(201, { bundle: await createBundle(locationId, body) });
	}, { body: bundleEditorBody })
	.get("/:bundleId", async ({ locationId, params, status }) => {
		const bundle = await getBundle(locationId, params.bundleId);

		if (!bundle) return status(404, { error: "Bundle not found" });

		return status(200, { bundle });
	})
	.patch("/:bundleId", async ({ locationId, params, body, status }) => {
		const options = await getCatalogOptions(locationId);
		const inputError = validateBundleInput(body, options);

		if (inputError) return status(400, { error: inputError });

		const result = await updateBundle(locationId, params.bundleId, body);

		switch (result.status) {
			case "not-found":
				return status(404, { error: "Bundle not found" });
			case "archived":
				return status(409, { error: "A purchased bundle cannot be edited after it has been archived" });
			case "updated":
			case "versioned":
				return status(200, { bundle: result.bundle });
		}
	}, { body: bundleEditorBody })
	.guard({}, (mutations) => mutations
	.onBeforeHandle(getBillingAccess)
	.post("/:bundleId/purchases", async ({ locationId, params, body, status }) => {
		const result = await prepareBundle({ ...body, locationId, bundleId: params.bundleId });

		if (result.status !== "created") return status(purchaseErrorCodes[result.status], { error: result.error, code: result.checkoutCreated === false ? "BUNDLE_PREPARE_REJECTED" : undefined });

		return status(201, result.value);
	}, {
		body: t.Object({
			purchaseId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
			memberId: t.String({ minLength: 1 }),
			paymentType: t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("us_bank_account")]),
			paymentMethodId: t.Optional(t.String({ minLength: 1 })),
			startDate: t.Optional(t.String({ minLength: 1 })),
			selectedOptionalComponentIds: t.Array(t.String({ minLength: 1 })),
		}),
	})
	.post("/:bundleId/purchases/:pid/pay", async ({ locationId, params, body, status }) => {
		const result = await payBundle({ locationId, bundleId: params.bundleId, purchaseId: params.pid, ...body });

		switch (result.status) {
			case "not-found":
				return status(404, { error: "Bundle purchase not found" });
			case "inactive":
				return status(409, { error: "Bundle purchase can no longer be paid" });
			case "payment-unavailable":
				return status(400, { error: result.error });
			case "ok":
				return status(200, result.value);
		}
	}, { body: t.Object({ paymentMethodId: t.Optional(t.String({ minLength: 1 })), paymentType: t.Optional(t.Union([t.Literal("card"), t.Literal("us_bank_account")])) }) })
	.post("/:bundleId/purchases/:pid/refund", async ({ locationId, params, body, status }) => {
		const result = await refundBundle({
			locationId,
			bundleId: params.bundleId,
			purchaseId: params.pid,
			reason: body.reason,
		});

		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });

		return status(200, result.value);
	}, { body: t.Object({ reason: t.Optional(t.String()) }) })
	.post("/:bundleId/purchases/:pid/cancel", async ({ locationId, params, body, status }) => {
		const result = await cancelBundle(locationId, params.pid, body.reason, params.bundleId);

		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });

		return status(200, { canceled: true });
	}, { body: t.Object({ reason: t.Optional(t.String()) }) }));
