import { db } from "@/db/db";
import { SquarePaymentGateway } from "@/libs/PaymentGateway";
import { memberSubscriptions } from "@subtrees/schemas";
import { addDays } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
export async function updateSubscriptionRoutes(app: Elysia) {
    return app.patch("/:sid", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { cancelAt, allowProration, trialDays, paymentMethodId } = body;

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
        });
        if (!sub) {
            return status(404, { error: "Subscription not found" });
        }

        let nextGatewayPaymentId: string | undefined;
        if (paymentMethodId) {
            const memberLocation = await db.query.memberLocations.findFirst({
                where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, sub.memberId)),
                columns: {
                    gatewayCustomerId: true,
                },
            });

            if (!memberLocation?.gatewayCustomerId) {
                return status(400, { error: "Member location is missing gateway customer" });
            }

            const locationState = await db.query.locationState.findFirst({
                where: (state, { eq }) => eq(state.locationId, lid),
                columns: {
                    paymentGatewayId: true,
                },
            });

            const integration = locationState?.paymentGatewayId
                ? await db.query.integrations.findFirst({
                    where: (integration, { eq }) => eq(integration.id, locationState.paymentGatewayId!),
                    columns: {
                        accountId: true,
                        accessToken: true,
                        service: true,
                    },
                })
                : await db.query.integrations.findFirst({
                    where: (integration, { eq }) => eq(integration.locationId, lid),
                    columns: {
                        accountId: true,
                        accessToken: true,
                        service: true,
                    },
                });

            if (!integration?.accessToken) {
                return status(404, { error: "Payment gateway integration not found" });
            }

            if (integration.service === "stripe") {
                if (!integration.accountId) {
                    return status(404, { error: "Stripe integration not found" });
                }

                nextGatewayPaymentId = paymentMethodId;
            } else if (integration.service === "square") {
                if (paymentMethodId.startsWith("cnon:")) {
                    return status(400, { error: "Saved Square card is required for subscription payment method updates" });
                }

                if (memberLocation.gatewayCustomerId.startsWith("cus_")) {
                    return status(400, { error: "Member location does not have a Square customer ID" });
                }

                const square = new SquarePaymentGateway(integration.accessToken);
                try {
                    await square.retrieveCardForCustomer(memberLocation.gatewayCustomerId, paymentMethodId);
                } catch {
                    return status(400, { error: "Selected Square card is not available for this member" });
                }

                nextGatewayPaymentId = paymentMethodId;
            } else {
                return status(400, { error: "Unsupported payment gateway for subscriptions" });
            }
        }

        const trialEnd = typeof trialDays === "number" && trialDays > 0
            ? addDays(new Date(), trialDays)
            : undefined;

        const [updated] = await db.update(memberSubscriptions).set({
            ...(cancelAt !== undefined ? { cancelAt: cancelAt ? new Date(cancelAt) : null } : {}),
            ...(nextGatewayPaymentId ? { gatewayPaymentId: nextGatewayPaymentId } : {}),
            ...(trialEnd ? { trialEnd } : {}),
            metadata: {
                ...(sub.metadata || {}),
                ...(allowProration !== undefined ? { allowProration } : {}),
                ...(nextGatewayPaymentId ? { paymentMethodId: nextGatewayPaymentId } : {}),
            },
            updated: new Date(),
        }).where(eq(memberSubscriptions.id, sid)).returning();

        return status(200, {
            subscription: updated,
            schedulerUpdated: false,
        });
    }, {
        body: t.Object({
            cancelAt: t.Optional(t.Nullable(t.String())),
            allowProration: t.Optional(t.Boolean()),
            trialDays: t.Optional(t.Number()),
            paymentMethodId: t.Optional(t.String()),
        }),
    });
}
