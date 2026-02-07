import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { memberPaymentMethods } from "@/db/schemas"; // Fix naming
import { eq, and } from "drizzle-orm"; // Assume drizzle-orm for query helpers

const GetMLPProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};



export function mlPaymentMethods(app: Elysia) {
    app.get("/methods", async ({ status, params }) => {
        const { mid, lid } = params;
        try {
            const methods = await db.query.memberPaymentMethods.findMany({
                where: (paymentMethod, { eq, and }) =>
                    and(
                        eq(paymentMethod.memberId, mid),
                        eq(paymentMethod.locationId, lid)
                    ),
            });
            return status(200, methods);
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    }, GetMLPProps);

    app.post("/methods", async ({ status, body, params }) => {
        const { mid, lid } = params;
        const { paymentMethodId } = body;
        try {
            const [newMemberPaymentMethod] = await db.insert(memberPaymentMethods).values({
                memberId: mid,
                locationId: lid,
                paymentMethodId: paymentMethodId,
            }).onConflictDoNothing({
                target: [memberPaymentMethods.memberId, memberPaymentMethods.locationId, memberPaymentMethods.paymentMethodId],
            }).returning();
            return status(200, newMemberPaymentMethod);
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    },
        {
            ...GetMLPProps,
            body: t.Object({
                paymentMethodId: t.String(),
            }),
        }
    );

    app.delete("/methods/:paymentMethodId", async ({ status, body, params }) => {
        const { mid, lid, paymentMethodId } = params;
        try {
            const method = await db.delete(memberPaymentMethods).where(
                and(
                    eq(memberPaymentMethods.memberId, mid),
                    eq(memberPaymentMethods.locationId, lid),
                    eq(memberPaymentMethods.paymentMethodId, paymentMethodId)
                )
            );
            return status(200, { success: true });
        } catch (err) {
            console.log(err);
            return status(500, { error: err });
        }
    },
        {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
                paymentMethodId: t.String(),
            }),
        }
    );
    return app;
}