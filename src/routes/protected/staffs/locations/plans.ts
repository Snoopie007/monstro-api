import { Elysia, t } from "elysia";
import { retrySubscriptionPayment, type RetryPaymentErrorCode } from "@/handlers/subscription/retryPayment";

const retryHttpStatus: Record<RetryPaymentErrorCode, number> = {
    SUBSCRIPTION_NOT_FOUND: 404,
    INVOICE_NOT_FOUND: 404,
    TRANSACTION_NOT_FOUND: 404,
    SUBSCRIPTION_CANCELED: 400,
    NO_PAYMENT_METHOD: 400,
    LOCATION_INACTIVE: 400,
    CHARGE_FAILED: 400,
};

export const slMemberPlanRoutes = new Elysia({ prefix: "/plans" })
    .post("/:memberPlanId/retry", async ({ params, status }) => {
        const { lid, memberPlanId } = params;
        try {
            const result = await retrySubscriptionPayment({ lid, memberPlanId });
            if (!result.ok) {
                return status(retryHttpStatus[result.code], { error: result.message, code: result.code });
            }
            return status(200, { success: true });
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
