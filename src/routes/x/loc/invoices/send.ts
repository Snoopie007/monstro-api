import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { calculateChargeDetails } from "@/libs/utils";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, transactions } from "@subtrees/schemas";
import {
    PENDING_TRANSACTION_STATUS,
    scheduleInvoiceReminderAndOverdue,
} from "./shared";

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
                        stripeCustomerId: true,
                    },
                },
                location: {
                    with: {
                        locationState: true,
                        integrations: {
                            where: (integration, { eq }) => eq(integration.service, "stripe"),
                            columns: { accountId: true, service: true },
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

        const collectionMethod = (invoice.metadata as { collectionMethod?: "send_invoice" | "charge_automatically" } | null)?.collectionMethod || "send_invoice";
        const shouldAutoCharge = collectionMethod === "charge_automatically" && invoice.paymentType !== "cash";

        if (shouldAutoCharge) {
            if (!invoice.member?.stripeCustomerId) {
                return status(400, { error: "Member is missing Stripe customer" });
            }

            const integration = invoice.location?.integrations?.[0];
            if (!integration?.accountId) {
                return status(404, { error: "Stripe integration not found" });
            }

            let selectedPaymentMethod:
                | {
                    stripeId: string;
                    type: "card" | "us_bank_account";
                }
                | undefined;

            if (paymentMethodId) {
                const pm = await db.query.paymentMethods.findFirst({
                    where: (p, { and, eq }) => and(eq(p.id, paymentMethodId), eq(p.memberId, invoice.memberId)),
                    columns: { stripeId: true, type: true },
                });
                if (!pm || (pm.type !== "card" && pm.type !== "us_bank_account")) {
                    return status(404, { error: "Valid payment method not found" });
                }
                selectedPaymentMethod = { stripeId: pm.stripeId, type: pm.type };
            }

            if (!selectedPaymentMethod) {
                const defaultMemberPaymentMethod = await db.query.memberPaymentMethods.findFirst({
                    where: (mpm, { and, eq }) => and(
                        eq(mpm.memberId, invoice.memberId),
                        eq(mpm.locationId, lid),
                        eq(mpm.isDefault, true)
                    ),
                });

                if (defaultMemberPaymentMethod) {
                    const pm = await db.query.paymentMethods.findFirst({
                        where: (p, { and, eq }) => and(
                            eq(p.id, defaultMemberPaymentMethod.paymentMethodId),
                            eq(p.memberId, invoice.memberId)
                        ),
                        columns: { stripeId: true, type: true },
                    });
                    if (pm && (pm.type === "card" || pm.type === "us_bank_account")) {
                        selectedPaymentMethod = { stripeId: pm.stripeId, type: pm.type };
                    }
                }
            }

            if (!selectedPaymentMethod) {
                return status(400, { error: "No default payment method found for automatic charging" });
            }

            const stripe = new MemberStripePayments(integration.accountId);
            stripe.setCustomer(invoice.member.stripeCustomerId);

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
                paymentMethodId: selectedPaymentMethod.stripeId,
                metadata: {
                    lid,
                    locationId: lid,
                    memberId: invoice.memberId,
                    invoiceId: invoice.id,
                },
                productName: invoice.description || "Invoice",
                currency: invoice.currency || "usd",
            });

            await db.transaction(async (tx) => {
                const existingTransaction = await tx.query.transactions.findFirst({
                    where: (tr, { and, eq }) => and(
                        eq(tr.invoiceId, iid),
                        eq(tr.locationId, lid),
                        eq(tr.status, PENDING_TRANSACTION_STATUS)
                    ),
                    columns: {
                        metadata: true,
                    },
                });

                await tx.update(memberInvoices).set({
                    status: "paid",
                    paid: true,
                    sentAt: new Date(),
                    updated: new Date(),
                }).where(eq(memberInvoices.id, iid));

                await tx.update(transactions).set({
                    status: "paid",
                    paymentType: selectedPaymentMethod!.type,
                    paymentMethodId: selectedPaymentMethod!.stripeId,
                    paymentIntentId,
                    chargeDate: new Date(),
                    metadata: {
                        ...((existingTransaction?.metadata as Record<string, unknown> | null) || {}),
                        collectionMethod: "charge_automatically",
                        paymentIntentId,
                    },
                    updated: new Date(),
                }).where(and(eq(transactions.invoiceId, iid), eq(transactions.status, PENDING_TRANSACTION_STATUS)));
            });

            return status(200, {
                success: true,
                message: "Invoice charged automatically",
                invoice: {
                    id: iid,
                    status: "paid",
                    paid: true,
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
