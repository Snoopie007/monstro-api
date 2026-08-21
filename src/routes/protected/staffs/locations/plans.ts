import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { getCheckoutContext } from "src/utils/getCheckoutContext";
import { chargeWithGateway } from "src/utils/checkoutUtil";

export const slMemberPlanRoutes = new Elysia({ prefix: "/plans" })

    .post("/:memberPlanId/retry", async ({ params, status }) => {
        const { lid, memberPlanId } = params;
        try {

            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(
                    eq(s.locationId, lid),
                    eq(s.id, memberPlanId),
                ),
            });
            if (!sub) {
                return status(404, { error: "Subscription not found" });
            }

            const invoice = await db.query.memberInvoices.findFirst({
                where: (i, { and, eq }) => and(
                    eq(i.memberPlanId, sub.id),
                    eq(i.forPeriodStart, sub.currentPeriodStart),
                    eq(i.status, "unpaid"),
                ),
            });
            if (!invoice) {
                return status(404, { error: "Failed invoice not found" });
            }


            const checkoutContext = await getCheckoutContext({ lid, mid: sub.memberId });
            const { ml, gateway, gatewayCustomerId, locationState } = checkoutContext;

            if (locationState.status !== "active") {
                return status(400, { error: "Location is not active" });
            }





            return status(200, {});
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            staffId: t.String(),
            memberPlanId: t.String(),
        }),
    });
