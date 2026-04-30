import { Elysia, t } from "elysia";
import { db } from "@/db/db";

export function publicLocationPaymentGateway(app: Elysia) {
    return app.get('/gateway', async ({ params, status }) => {
        const { lid } = params;
        try {

            const locationState = await db.query.locationState.findFirst({
                where: (locationState, { eq }) => eq(locationState.locationId, lid),
                columns: {
                    paymentGatewayId: true,
                }
            });

            if (!locationState) {
                return status(404, { error: "Location state not found" });
            }

            const paymentGatewayId = locationState.paymentGatewayId;

            if (!paymentGatewayId) {
                return status(404, { error: "No default payment gateway set" });
            }

            const gateway = await db.query.integrations.findFirst({
                where: (integration, { eq }) => eq(
                    integration.id,
                    paymentGatewayId
                ),
                columns: {
                    apiKey: true,
                    service: true,
                    accountId: true,
                }
            });

            if (!gateway) {
                throw new Error("Payment gateway not found");
            }

            let data = {
                key: gateway.apiKey,
                service: gateway.service,
                accountId: gateway.accountId,
            }

            return status(200, data);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to get integration" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
    });
}