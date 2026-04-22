import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { memberSubscriptions } from "@subtrees/schemas";
import { addDays } from "date-fns";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { resolveStripePaymentMethodForCustomer } from "./shared";
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

        let nextStripePaymentId: string | undefined;
        if (paymentMethodId) {
            const memberLocation = await db.query.memberLocations.findFirst({
                where: (ml, { and, eq }) => and(eq(ml.locationId, lid), eq(ml.memberId, sub.memberId)),
                columns: {
                    stripeCustomerId: true,
                },
            });

            if (!memberLocation?.stripeCustomerId) {
                return status(400, { error: "Member location is missing Stripe customer" });
            }

            const integration = await db.query.integrations.findFirst({
                where: (integration, { and, eq }) => and(eq(integration.locationId, lid), eq(integration.service, "stripe")),
                columns: {
                    accountId: true,
                    accessToken: true,
                },
            });

            if (!integration?.accountId || !integration.accessToken) {
                return status(404, { error: "Stripe integration not found" });
            }

            const stripe = new MemberStripePayments(integration.accountId, integration.accessToken);
            const resolvedPaymentMethod = await resolveStripePaymentMethodForCustomer({
                stripe,
                stripeCustomerId: memberLocation.stripeCustomerId,
                paymentMethodId,
                invalidMessage: "Selected payment method is not available for this member",
                unsupportedMessage: "Unsupported payment method type",
                upstreamMessage: "Failed to validate payment method with Stripe",
                logLabel: "[x/subscriptions/update] payment method validation failed",
                logContext: { lid, sid, memberId: sub.memberId, paymentMethodId },
            });

            if (!resolvedPaymentMethod.ok) {
                return status(resolvedPaymentMethod.statusCode, { error: resolvedPaymentMethod.error });
            }

            nextStripePaymentId = resolvedPaymentMethod.paymentMethod.id;
        }

        const trialEnd = typeof trialDays === "number" && trialDays > 0
            ? addDays(new Date(), trialDays)
            : undefined;

        const [updated] = await db.update(memberSubscriptions).set({
            ...(cancelAt !== undefined ? { cancelAt: cancelAt ? new Date(cancelAt) : null } : {}),
            ...(nextStripePaymentId ? { stripePaymentId: nextStripePaymentId } : {}),
            ...(trialEnd ? { trialEnd } : {}),
            metadata: {
                ...(sub.metadata || {}),
                ...(allowProration !== undefined ? { allowProration } : {}),
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
