import { Elysia, t } from "elysia";
import {
	cancelBundlePurchase,
	prepareBundlePurchase,
	type BundlePurchaseErrorStatus,
} from "./bundlePurchases";
import { payBundlePurchase } from "./bundlePayment";
import { refundBundlePurchase } from "./bundleRefund";
import {
	archiveBundle,
	createBundle,
	getBundle,
	getCatalogOptions,
	listBundles,
	updateBundle,
} from "./catalog";
import { bundleEditorBody, validateBundleEditorInput } from "./input";
import { resolveLocationAccess, resolveMemberBillingAccess } from "./routeAccess";

function purchaseErrorCode(status: BundlePurchaseErrorStatus) {
	switch (status) {
		case "member-not-found":
		case "bundle-not-found":
			return 404;
		case "invalid-components":
		case "payment-unavailable":
			return 400;
		case "intent-conflict":
		case "pricing-conflict":
			return 409;
	}
}

export const bundleRoutes = new Elysia({ prefix: "/bundles" })
	.resolve(resolveLocationAccess)
	.get("/", async ({ locationId, status }) => {
		return status(200, { bundles: await listBundles(locationId) });
	})
	.post("/", async ({ locationId, body, status }) => {
		const options = await getCatalogOptions(locationId);
		const inputError = validateBundleEditorInput(body, options);

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
		const inputError = validateBundleEditorInput(body, options);

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
	.post("/:bundleId/archive", async ({ locationId, params, status }) => {
		const bundle = await archiveBundle(locationId, params.bundleId);

		if (!bundle) return status(404, { error: "Bundle not found" });

		return status(200, { bundle });
	})
	.guard({}, (mutations) => mutations
	.onBeforeHandle(resolveMemberBillingAccess)
	.post("/:bundleId/purchases", async ({ locationId, params, body, status }) => {
		const result = await prepareBundlePurchase({ ...body, locationId, bundleId: params.bundleId });

		if (result.status !== "created") return status(purchaseErrorCode(result.status), { error: result.error, code: result.checkoutCreated === false ? "BUNDLE_PREPARE_REJECTED" : undefined });

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
		const result = await payBundlePurchase({ locationId, bundleId: params.bundleId, purchaseId: params.pid, ...body });

		switch (result.status) {
			case "not-found":
				return status(404, { error: "Bundle purchase not found" });
			case "inactive":
				return status(409, { error: "Bundle purchase can no longer be paid" });
			case "ok":
				return status(200, result.value);
		}
	}, { body: t.Object({ paymentMethodId: t.Optional(t.String({ minLength: 1 })), paymentType: t.Optional(t.Union([t.Literal("card"), t.Literal("us_bank_account")])) }) })
	.post("/:bundleId/purchases/:pid/refund", async ({ locationId, params, body, status }) => {
		const result = await refundBundlePurchase({
			locationId,
			bundleId: params.bundleId,
			purchaseId: params.pid,
			reason: body.reason,
		});

		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });

		return status(200, result.value);
	}, { body: t.Object({ reason: t.Optional(t.String()) }) })
	.post("/:bundleId/purchases/:pid/cancel", async ({ locationId, params, body, status }) => {
		const result = await cancelBundlePurchase(locationId, params.pid, body.reason, params.bundleId);

		if (result.status === "not-found") return status(404, { error: "Bundle purchase not found" });

		return status(200, { canceled: true });
	}, { body: t.Object({ reason: t.Optional(t.String()) }) }));
