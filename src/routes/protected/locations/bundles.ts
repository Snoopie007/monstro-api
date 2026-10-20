import { Elysia, t } from "elysia";
import { bundlePurchaseErrorCodes, prepareBundle } from "@/handlers/addonsBundles/checkout/prepare";
import { payBundle } from "@/handlers/addonsBundles/checkout/pay";
import { listMemberBundles } from "@/routes/x/loc/addonsBundles/catalog";

/** Bundles members can buy themselves, by card or bank account. */
export function locationBundles(app: Elysia) {
    return app.get('/bundles', async ({ params, status }) => {
        return status(200, { bundles: await listMemberBundles(params.lid) });
    }, {
        params: t.Object({ lid: t.String() }),
    }).post('/bundles/:bundleId/purchase', async ({ params, body, status }) => {
        const { lid, bundleId } = params;
        const { mid, purchaseId, paymentMethodId, paymentType, selectedOptionalComponentIds = [] } = body;
        const prepared = await prepareBundle({
            locationId: lid, bundleId, memberId: mid, purchaseId, paymentMethodId, paymentType, selectedOptionalComponentIds,
        });

        if (prepared.status !== "created") {
            // BUNDLE_PREPARE_REJECTED: nothing was saved, so the app can start over with a new purchaseId.
            return status(bundlePurchaseErrorCodes[prepared.status], {
                error: prepared.error,
                code: prepared.checkoutCreated === false ? "BUNDLE_PREPARE_REJECTED" : undefined,
            });
        }

        // Sending the same purchaseId again retries the same invoice instead of charging twice.
        const paid = await payBundle({ locationId: lid, bundleId, purchaseId, paymentMethodId, paymentType });

        if (paid.status === "ok") return status(200, paid.value);

        if (paid.status === "payment-unavailable") return status(400, { error: paid.error });

        // The bundle was canceled after it was prepared.
        return status(409, { error: "Bundle purchase can no longer be paid" });
    }, {
        params: t.Object({ lid: t.String(), bundleId: t.String() }),
        body: t.Object({
            mid: t.String({ minLength: 1 }),
            purchaseId: t.String({ minLength: 1, maxLength: 128 }),
            paymentMethodId: t.String({ minLength: 1 }),
            paymentType: t.Union([t.Literal("card"), t.Literal("us_bank_account")]),
            selectedOptionalComponentIds: t.Optional(t.Array(t.String({ minLength: 1 }))),
        }),
    });
}
