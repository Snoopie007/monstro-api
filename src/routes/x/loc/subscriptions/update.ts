import { db } from "@/db/db";
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

        let nextStripePaymentId: string | undefined;
        if (paymentMethodId) {
            const pm = await db.query.paymentMethods.findFirst({
                where: (p, { and, eq }) => and(eq(p.id, paymentMethodId), eq(p.memberId, sub.memberId)),
                columns: { stripeId: true },
            });
            if (!pm) {
                return status(404, { error: "Payment method not found" });
            }
            nextStripePaymentId = pm.stripeId;
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
