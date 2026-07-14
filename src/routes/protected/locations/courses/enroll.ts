import type { Elysia } from "elysia";
import { t } from "elysia";
import { handleCourseCheckout, mapCourseCheckoutError } from "@/handlers/course";

export function locationCoursesEnroll(app: Elysia) {
    return app.post("/courses/enroll", async ({ params, status, body }) => {
        const { lid } = params;
        const { items, promoId, paymentMethodId, mid } = body;

        try {
            const order = await handleCourseCheckout({
                lid,
                mid,
                items,
                paymentMethodId,
                promoId,
            });
            return status(200, order);
        } catch (error) {
            return mapCourseCheckoutError(status, error);
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            mid: t.String(),
            items: t.Array(t.Object({
                courseId: t.String(),
                quantity: t.Number(),
            })),
            promoId: t.Optional(t.Nullable(t.String())),
            paymentMethodId: t.String(),
        }),
    });
}
