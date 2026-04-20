import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { calculateChargeDetails } from "@/utils";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { memberInvoices } from "@subtrees/schemas";
import { scheduleInvoiceReminderAndOverdue } from "./shared";

export async function sendInvoiceRoutes(app: Elysia) {
    return app.post("/:iid/send", async ({ params, body, status }) => {
        const { lid, iid } = params as { lid: string; iid: string };
        const { paymentMethodId } = body as { paymentMethodId?: string };

        const invoice = await db.query.memberInvoices.findFirst({
            where: (inv, { and, eq }) => and(eq(inv.id, iid), eq(inv.locationId, lid)),
            with: {
                member: {
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                location: {
                    with: {
                        locationState: true,
                        integrations: {
                            where: (integration, { eq }) => eq(integration.service, "stripe"),
                            columns: {
                                accountId: true,
                                service: true,
                                accessToken: true,
                            },
                        },
                    },
                },
            },
        });




        if (!invoice) {
            return status(404, { error: "Invoice not found" });
        }

        if (invoice.status !== "draft") {
            return status(400, { error: "Invoice must be draft to send" });
        }
        const ml = await db.query.memberLocations.findFirst({
            where: (ml, { eq, and }) => and(eq(ml.locationId, lid), eq(ml.memberId, invoice?.memberId)),
            columns: {
                stripeCustomerId: true,
            },
        });
        if (!ml || !ml.stripeCustomerId) {
            return status(404, { error: "Member location or Stripe customer not found" });
        }
        const collectionMethod = (invoice.metadata as { collectionMethod?: "send_invoice" | "charge_automatically" } | null)?.collectionMethod || "send_invoice";
        const shouldAutoCharge = collectionMethod === "charge_automatically" && invoice.paymentType !== "cash";

        if (shouldAutoCharge) {
            const integration = invoice.location?.integrations?.[0];
            if (!integration || !integration.accountId || !integration.accessToken) {
                return status(404, { error: "Stripe integration not found" });
            }

            const stripe = new MemberStripePayments(integration.accountId, integration.accessToken);
            stripe.setCustomer(ml.stripeCustomerId);

            let paymentMethod: { id: string; type: string } | undefined;

            if (paymentMethodId) {
                try {
                    paymentMethod = await stripe.retrievePaymentMethod(ml.stripeCustomerId, paymentMethodId);
                } catch {
                    return status(400, { error: "Selected payment method cannot be used for automatic charging" });
                }
            } else {
                const customer = await stripe.getCustomer(ml.stripeCustomerId);
                if (!customer) {
                    return status(404, { error: "Stripe customer not found" });
                }

                const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
                if (!defaultPaymentMethod) {
                    return status(400, { error: "No default payment method found for automatic charging" });
                }

                if (typeof defaultPaymentMethod === "string") {
                    try {
                        paymentMethod = await stripe.retrievePaymentMethod(ml.stripeCustomerId, defaultPaymentMethod);
                    } catch {
                        return status(400, { error: "Default payment method cannot be used for automatic charging" });
                    }
                } else {
                    paymentMethod = defaultPaymentMethod;
                }
            }

            if (!paymentMethod) {
                return status(400, { error: "No default payment method found for automatic charging" });
            }

            if (paymentMethod.type !== "card" && paymentMethod.type !== "us_bank_account") {
                return status(400, {
                    error: paymentMethodId
                        ? "Selected payment method cannot be used for automatic charging"
                        : "Default payment method cannot be used for automatic charging",
                });
            }

            const selectedPaymentMethod: {
                id: string;
                type: "card" | "us_bank_account";
            } = {
                id: paymentMethod.id,
                type: paymentMethod.type,
            };

            const chargeDetails = calculateChargeDetails({
                amount: invoice.total,
                discount: 0,
                taxRate: 0,
                usagePercent: invoice.location?.locationState?.usagePercent ?? 0,
                paymentType: selectedPaymentMethod.type,
                isRecurring: false,
                passOnFees: false,
            });

            const { id: paymentIntentId } = await stripe.processPayment({
                total: chargeDetails.total,
                unitCost: chargeDetails.unitCost,
                tax: chargeDetails.tax,
                applicationFeeAmount: chargeDetails.applicationFeeAmount,
                description: invoice.description || `Invoice ${invoice.id}`,
                paymentMethodId: selectedPaymentMethod.id,
                metadata: {
                    lid,
                    locationId: lid,
                    memberId: invoice.memberId,
                    invoiceId: invoice.id,
                    memberPlanId: invoice.memberPlanId || "",
                },
                productName: invoice.description || "Invoice",
                currency: invoice.currency || "usd",
            });

            await db.update(memberInvoices).set({
                status: "sent",
                sentAt: new Date(),
                updated: new Date(),
            }).where(eq(memberInvoices.id, iid));

            return status(200, {
                success: true,
                message: "Automatic charge initiated",
                invoice: {
                    id: iid,
                    status: "sent",
                },
                paymentIntentId,
            });
        }

        await db.update(memberInvoices).set({
            status: "sent",
            sentAt: new Date(),
            updated: new Date(),
        }).where(eq(memberInvoices.id, iid));

        if (invoice.member && invoice.location) {
            await scheduleInvoiceReminderAndOverdue(iid, new Date(invoice.dueDate), {
                member: {
                    firstName: invoice.member.firstName,
                    lastName: invoice.member.lastName,
                    email: invoice.member.email,
                },
                location: {
                    name: invoice.location.name,
                    email: invoice.location.email,
                    phone: invoice.location.phone,
                },
                invoice: {
                    id: invoice.id,
                    total: invoice.total,
                    dueDate: invoice.dueDate,
                    description: invoice.description,
                    items: invoice.items || [],
                    status: "sent",
                },
            });
        }

        return status(200, {
            success: true,
            message: "Invoice marked as sent",
            invoice: {
                id: iid,
                status: "sent",
            },
        });
    }, {
        body: t.Object({
            paymentMethodId: t.Optional(t.String()),
        }),
    });
}
