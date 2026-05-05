import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import type { PaymentMethod } from "@subtrees/types";
import { memberLocations } from "@subtrees/schemas";
import { SquarePaymentGateway } from "@/libs/PaymentGateway/SquarePayment";
import { SquareError } from "square";

const SharedProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};


export function SquarePaymentMethodsRoutes(app: Elysia) {
    app.group('/square', (app) => {
        app.get("/", async ({ status, params }) => {
            const { mid, lid } = params;
            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (memberLocation, { eq, and }) => and(
                        eq(memberLocation.memberId, mid),
                        eq(memberLocation.locationId, lid)
                    ),
                    columns: {
                        gatewayCustomerId: true,
                    },
                });
                if (!ml) {
                    return status(404, { error: "Member location not found" });
                }

                if (!ml.gatewayCustomerId) {
                    return status(200, []);
                }

                const squareGateway = await db.query.integrations.findFirst({
                    where: (i, { eq, and }) => and(
                        eq(i.locationId, lid),
                        eq(i.service, "square")
                    ),
                    columns: {
                        accountId: true,
                        accessToken: true,
                        metadata: true,
                    },
                });



                if (!squareGateway || !squareGateway.accountId || !squareGateway.accessToken) {
                    return status(404, { error: "Square integration not found" });
                }

                const square = new SquarePaymentGateway(squareGateway.accessToken);
                let paymentMethods: PaymentMethod[] = [];
                if (ml.gatewayCustomerId) {
                    const pms = await square.getCards(ml.gatewayCustomerId);


                    if (pms.length > 0) {
                        pms.forEach(pm => {
                            // Ensure all required PaymentMethod fields are present and not undefined
                            if (!pm.id) return; // skip if no id; shouldn't happen but for type safety

                            paymentMethods.push({
                                id: pm.id,
                                source: 'square',
                                type: 'card',
                                isDefault: false,
                                card: {
                                    brand: pm.cardBrand ? pm.cardBrand.toLowerCase() : 'unknown',
                                    last4: pm.last4!,
                                    expMonth: Number(pm.expMonth),
                                    expYear: Number(pm.expYear),
                                },
                                usBankAccount: undefined,
                            });
                        });
                    }
                }



                return status(200, paymentMethods);
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        }, SharedProps);
        app.delete("/:paymentMethodId", async ({ status, params }) => {
            const { mid, lid, paymentMethodId } = params;
            try {

                return status(200, { success: true });
            } catch (err) {
                console.log(err);
                return status(500, { error: err });
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
                paymentMethodId: t.String(),
            }),
        });

        app.post("/", async ({ status, body, params }) => {
            const { mid, lid } = params;
            const { nonce } = body;
            try {
                const ml = await db.query.memberLocations.findFirst({
                    where: (ml, { eq, and }) => and(
                        eq(ml.memberId, mid),
                        eq(ml.locationId, lid)
                    ),
                    with: {
                        member: {
                            columns: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                    columns: {
                        gatewayCustomerId: true,
                    },
                });


                if (!ml) {
                    return status(404, { error: "Member location not found" });
                }


                const squareGateway = await db.query.integrations.findFirst({
                    where: (i, { eq, and }) => and(eq(i.locationId, lid), eq(i.service, "square")),
                    columns: {
                        accountId: true,
                        accessToken: true,
                    },
                });

                if (!squareGateway || !squareGateway.accountId || !squareGateway.accessToken) {
                    return status(404, { error: "Square integration not found" });
                }



                const square = new SquarePaymentGateway(squareGateway.accessToken);

                if (!ml.gatewayCustomerId) {
                    try {
                        const customer = await square.createCustomer({
                            ...ml.member,
                        });
                        await db.update(memberLocations).set({
                            gatewayCustomerId: customer.id,
                        }).where(and(
                            eq(memberLocations.memberId, mid),
                            eq(memberLocations.locationId, lid)
                        ));
                    } catch (err) {
                        console.log(err);
                        return status(500, { error: "Failed to create customer" });
                    }
                }

                const cardholderName = [ml.member?.firstName, ml.member?.lastName].filter(Boolean).join(" ") || "Cardholder";
                const card = await square.createCard(mid, cardholderName, nonce);
                if (!card || !card.id) {
                    return status(400, { error: "Failed to create card" });
                }
                const pm = {
                    id: card.id,
                    source: 'square',
                    type: 'card',
                    isDefault: false,
                    card: {
                        brand: card.cardBrand ? card.cardBrand.toLowerCase() : 'unknown',
                        last4: card.last4!,
                        expMonth: Number(card.expMonth),
                        expYear: Number(card.expYear),
                    },
                    usBankAccount: undefined,
                }

                return status(200, pm);

            } catch (err) {

                if (err instanceof SquareError) {
                    if (err.errors.length > 0) {
                        const error = err.errors[0]
                        if (!error) {
                            return status(500, { error: "Failed to add card" })
                        }
                        switch (error.code) {
                            case "INVALID_REQUEST_ERROR":
                                return status(500, { error: error.detail })
                            case "INVALID_REQUEST_ERROR":
                                return status(500, { error: error.detail })
                            default:
                                return status(500, { error: error.detail })
                        }
                    }
                    return status(500, { error: "Failed to create card" })
                }
            }
        }, {
            params: t.Object({
                mid: t.String(),
                lid: t.String(),
            }),
            body: t.Object({
                nonce: t.String(),
            }),
        });
        return app;
    })

    return app;
}