import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { memberSubscriptions } from "@subtrees/schemas";
import {
    getStripePaymentMethods,
    getStripeSetupIntent,
} from "@/handlers/paymentMethods";

export async function memberLocationAccessDenied(
    mid: string,
    lid: string,
    actorMemberId: string | null | undefined,
    isServiceRole: boolean | undefined,
) {
    if (isServiceRole) return null;
    if (!actorMemberId) {
        return { error: "Unauthorized", code: "UNAUTHORIZED" };
    }
    if (actorMemberId !== mid) {
        const familyAccess = await db.query.familyMembers.findFirst({
            where: (row, { and, eq }) => and(
                eq(row.memberId, mid),
                eq(row.relatedMemberId, actorMemberId),
                eq(row.relationship, "child"),
            ),
            columns: { id: true },
        });
        if (!familyAccess) {
            return { error: "You cannot access another member's payment methods", code: "FORBIDDEN" };
        }
    }
    const memberLocation = await db.query.memberLocations.findFirst({
        where: (row, { and, eq }) => and(eq(row.memberId, mid), eq(row.locationId, lid)),
        columns: { memberId: true },
    });
    return memberLocation ? null : { error: "Member location not found", code: "FORBIDDEN" };
}
const SharedProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

const NOT_FOUND_ERRORS = new Set([
    "Stripe customer not found",
    "Stripe integration not found",
    "Location state not found",
    "Payment gateway not found",
    "Member location not found",
]);

export function StripePaymentMethodsRoutes(app: Elysia) {
    app.group("/stripe", (app) => {
        app.get("/", async ({ status, params, ...ctx }) => {
            const { mid, lid } = params;
            const { memberId, isServiceRole } = ctx as { memberId?: string | null; isServiceRole?: boolean };
            const denied = await memberLocationAccessDenied(mid, lid, memberId, isServiceRole);
            if (denied) return status(403, denied);
            try {
                const paymentMethods = await getStripePaymentMethods(mid, lid);
                return status(200, paymentMethods);
            } catch (err) {
                console.log(err);
                if (err instanceof Error && err.message === "Multiple Stripe billing customers require support") {
                    return status(409, { error: err.message, code: "AMBIGUOUS_BILLING_CUSTOMER" });
                }
                if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                return status(500, { error: err });
            }
        }, SharedProps);

        app.delete("/:pmId", async ({ status, params, ...ctx }) => {
            const { lid, mid, pmId } = params;
            const { memberId, isServiceRole } = ctx as { memberId?: string | null; isServiceRole?: boolean };
            const denied = await memberLocationAccessDenied(mid, lid, memberId, isServiceRole);
            if (denied) return status(403, denied);
            try {
                const inUse = await db.query.memberSubscriptions.findFirst({
                    where: (subscription, { and, eq, isNull }) => and(
                        eq(subscription.locationId, lid),
                        eq(subscription.memberId, mid),
                        isNull(subscription.parentId),
                        eq(subscription.gatewayPaymentId, pmId),
                    ),
                    columns: { id: true },
                });
                if (inUse) {
                    return status(409, {
                        error: "Payment method is in use by a subscription; select a replacement first",
                        code: "PAYMENT_METHOD_IN_USE",
                    });
                }
                // Keep the mobile endpoint non-destructive; actual detach requires an explicit billing action.
                return status(200, { success: true, detached: false });
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
                pmId: t.String(),
            }),
        });

        app.get("/intent", async ({ status, params, query, ...ctx }) => {
            const { mid, lid } = params;
            const { memberId, isServiceRole } = ctx as { memberId?: string | null; isServiceRole?: boolean };
            const denied = await memberLocationAccessDenied(mid, lid, memberId, isServiceRole);
            if (denied) return status(403, denied);
            const { ephemeralKey } = query;

            try {


                const result = await getStripeSetupIntent({
                    mid,
                    lid,
                    ephemeralKey,
                });

                return status(200, result);
            } catch (err) {
                console.log(err);
                if (err instanceof Error && err.message === "Multiple Stripe billing customers require support") {
                    return status(409, { error: err.message, code: "AMBIGUOUS_BILLING_CUSTOMER" });
                }
                if (err instanceof Error && NOT_FOUND_ERRORS.has(err.message)) {
                    return status(404, { error: err.message });
                }
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            query: t.Object({
                ephemeralKey: t.Optional(t.Boolean()),
            }),
        });

        return app;
    });

    return app;
}
