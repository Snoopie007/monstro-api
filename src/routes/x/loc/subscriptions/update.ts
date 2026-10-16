import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import { memberSubscriptions } from "@/subtrees/schemas";
import { BillingContextError, findInFlightSubscriptionAttempt, resolveSubscriptionBillingContext } from "./billingContext";
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
        if (sub.parentId) {
            return status(400, { error: "Only root subscriptions can be updated", code: "SUBSCRIPTION_CHILD" });
        }
        const deferred = getDeferredBilling(sub.metadata);
        if (deferred && (trialDays || allowProration)) return status(400, { error: "Trial days and legacy proration cannot be added to delayed billing" });
        if (deferred && cancelAt && new Date(cancelAt) <= new Date(deferred.firstPaymentAt)) {
            return status(400, { error: "Use Cancel to end access before the first payment" });
        }
        const inFlight = await findInFlightSubscriptionAttempt(sub.id);
        if (inFlight) {
            return status(409, {
                error: "A payment attempt is still in flight; resolve it before changing billing",
                code: "PAYMENT_ATTEMPT_IN_FLIGHT",
                invoiceId: inFlight.invoice?.id,
                attemptStatus: inFlight.status,
            });
        }

        let nextGatewayPaymentId: string | undefined;
        let nextPaymentType: typeof sub.paymentType | undefined;
        let gatewayIntegrationId: string | undefined;
        let gatewayCustomerId: string | undefined;
        if (paymentMethodId) {
            try {
                const billingContext = await resolveSubscriptionBillingContext(sub, {
                    paymentMethodId,
                    requirePaymentMethod: true,
                });
                nextGatewayPaymentId = billingContext.paymentMethodId ?? undefined;
                nextPaymentType = billingContext.paymentMethodType ?? undefined;
                gatewayIntegrationId = billingContext.gateway.id;
                gatewayCustomerId = billingContext.gatewayCustomerId;
            } catch (error) {
                if (error instanceof BillingContextError) {
                    const statusCode = error.code === "GATEWAY_NOT_FOUND" || error.code === "GATEWAY_NOT_CONFIGURED" ? 404 : 400;
                    return status(statusCode, { error: error.message, code: error.code });
                }
                throw error;
            }
        }

        const trialEnd = typeof trialDays === "number" && trialDays > 0
            ? addDays(new Date(), trialDays)
            : undefined;

        const [updated] = await db.update(memberSubscriptions).set({
            ...(cancelAt !== undefined ? { cancelAt: cancelAt ? new Date(cancelAt) : null } : {}),
            ...(nextGatewayPaymentId ? { gatewayPaymentId: nextGatewayPaymentId } : {}),
            ...(nextPaymentType ? { paymentType: nextPaymentType } : {}),
            metadata: {
                ...(sub.metadata || {}),
                ...(allowProration !== undefined ? { allowProration } : {}),
                ...(nextGatewayPaymentId ? { paymentMethodId: nextGatewayPaymentId } : {}),
                ...(gatewayIntegrationId ? { gatewayIntegrationId } : {}),
                ...(gatewayCustomerId ? { gatewayCustomerId } : {}),
            },
            updated: new Date(),
        }).where(eq(memberSubscriptions.id, sid)).returning();

        return status(200, {
            subscription: updated,
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
