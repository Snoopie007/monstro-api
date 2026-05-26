import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import type { PaymentMethod } from "@subtrees/types";
import { memberLocations } from "@subtrees/schemas";
import { SquarePaymentGateway } from "@/libs/PaymentGateway/SquarePayment";
import { SquareError } from "square";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";




export const webSquareGateway = new Elysia()
    .use(WebAuthMiddleware)
    .get("/square", async ({ params, status, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }
        const mid = session.user.memberId;
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
    })
    .post("/square", async ({ params, status, body, lid, session }) => {
        if (!lid) {
            return status(401, { error: "Unauthorized" });
        }
        if (!session) {
            return status(401, { error: "Unauthorized" });
        }
        const mid = session.user.memberId;
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
                console.log("Member location not found");
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

            let customerId: string | undefined = ml.gatewayCustomerId || undefined;
            if (!customerId) {
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
                    customerId = customer.id;
                } catch (err) {
                    console.log(err);
                    return status(500, { error: "Failed to create customer" });
                }
            }

            if (!customerId) {
                return status(400, { error: "Customer ID not found" });
            }
            const cardholderName = `${ml.member?.firstName} ${ml.member?.lastName}`;

            const card = await square.createCard(customerId, nonce, {
                cardholderName,
                referenceId: mid,
            });
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
        body: t.Object({
            nonce: t.String(),
        }),
    });
