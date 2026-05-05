import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails } from "@/utils";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { memberInvoices, transactions } from "@subtrees/schemas";
import { scheduleInvoiceReminderAndOverdue } from "./shared";
import type { Currency } from "square";

type InvoiceChargeMetadata = {
    collectionMethod?: "send_invoice" | "charge_automatically";
    paymentMethodId?: string;
    gatewayService?: "stripe" | "square";
};

function squareLocationIdFromMetadata(metadata: unknown) {
    return typeof metadata === "object" && metadata !== null && "squareLocationId" in metadata
        ? String((metadata as { squareLocationId?: unknown }).squareLocationId || "")
        : "";
}

function squareChargeFailure(error: unknown) {
    const raw = error as any;
    const body = raw?.body ?? raw?.response?.body ?? raw?.details ?? raw;
    const errors = body?.errors ?? raw?.errors ?? [];
    const firstError = Array.isArray(errors) ? errors[0] : undefined;
    const payment = body?.payment ?? raw?.payment;

    return {
        payment,
        code: firstError?.code ?? raw?.code ?? "SQUARE_CHARGE_FAILED",
        detail: firstError?.detail ?? raw?.message ?? "Square charge failed",
        category: firstError?.category,
        errors,
    };
}

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
                            columns: {
                                id: true,
                                accountId: true,
                                service: true,
                                accessToken: true,
                                metadata: true,
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
                gatewayCustomerId: true,
            },
        });
        if (!ml || !ml.gatewayCustomerId) {
            return status(404, { error: "Member location or Stripe customer not found" });
        }
        const invoiceMetadata = (invoice.metadata as InvoiceChargeMetadata | null) ?? null;
        const collectionMethod = invoiceMetadata?.collectionMethod || "send_invoice";
        const shouldAutoCharge = collectionMethod === "charge_automatically" && invoice.paymentType !== "cash";

        if (shouldAutoCharge) {
            const integration = invoice.location?.integrations?.find((candidate) => {
                if (invoiceMetadata?.gatewayService) return candidate.service === invoiceMetadata.gatewayService;
                return candidate.id === invoice.location?.locationState?.paymentGatewayId;
            }) ?? invoice.location?.integrations?.[0];
            if (!integration || !integration.accessToken) {
                return status(404, { error: "Payment gateway integration not found" });
            }

            if (integration.service === "square") {
                const selectedPaymentMethodId = paymentMethodId || invoiceMetadata?.paymentMethodId;
                if (!selectedPaymentMethodId) {
                    return status(400, { error: "Selected Square payment method is required for automatic charging" });
                }

                if (ml.gatewayCustomerId.startsWith("cus_")) {
                    return status(400, { error: "Member location does not have a Square customer ID" });
                }

                const squareLocationId = squareLocationIdFromMetadata(integration.metadata);
                if (!squareLocationId) {
                    return status(400, { error: "Square location ID not found" });
                }

                const square = new SquarePaymentGateway(integration.accessToken);
                const chargeDetails = calculateChargeDetails({
                    amount: invoice.total,
                    discount: 0,
                    taxRate: 0,
                    usagePercent: invoice.location?.locationState?.usagePercent ?? 0,
                    paymentType: "card",
                    isRecurring: false,
                    passOnFees: false,
                });

                try {
                    const payment = await square.createCharge(ml.gatewayCustomerId, selectedPaymentMethodId, {
                        total: chargeDetails.total,
                        feesAmount: chargeDetails.feesAmount,
                        currency: (invoice.currency?.toUpperCase() || "USD") as Currency,
                        referenceId: invoice.id,
                        squareLocationId,
                        note: `${invoice.description || `Invoice ${invoice.id}`}|invId:${invoice.id}|mid:${invoice.memberId}|lid:${lid}`,
                    });

                    const transactionValues = {
                        memberId: invoice.memberId,
                        locationId: lid,
                        invoiceId: invoice.id,
                        description: invoice.description || `Invoice ${invoice.id}`,
                        type: "inbound" as const,
                        status: "paid" as const,
                        paymentType: "card" as const,
                        paymentMethodId: selectedPaymentMethodId,
                        paymentIntentId: payment?.id,
                        total: invoice.total,
                        subTotal: invoice.subTotal,
                        tax: invoice.tax,
                        currency: invoice.currency || "usd",
                        feeAmount: chargeDetails.feesAmount,
                        failedCode: null,
                        failedReason: null,
                        metadata: {
                            ...invoiceMetadata,
                            invoiceId: invoice.id,
                            gatewayService: "square" as const,
                            paymentMethodId: selectedPaymentMethodId,
                            squarePaymentId: payment?.id,
                            chargeId: payment?.id,
                            squarePaymentStatus: payment?.status,
                        },
                        items: invoice.items || [],
                        updated: new Date(),
                    };

                    const existingTransaction = await db.query.transactions.findFirst({
                        where: (transaction, { eq }) => eq(transaction.invoiceId, invoice.id),
                    });

                    if (existingTransaction) {
                        await db.update(transactions).set(transactionValues).where(eq(transactions.id, existingTransaction.id));
                    } else {
                        await db.insert(transactions).values(transactionValues);
                    }

                    await db.update(memberInvoices).set({
                        status: "paid",
                        paid: true,
                        sentAt: new Date(),
                        metadata: {
                            ...invoiceMetadata,
                            paymentMethodId: selectedPaymentMethodId,
                            gatewayService: "square" as const,
                            squarePaymentId: payment?.id,
                            chargeId: payment?.id,
                            squarePaymentStatus: payment?.status,
                        },
                        updated: new Date(),
                    }).where(eq(memberInvoices.id, iid));

                    return status(200, {
                        success: true,
                        message: "Invoice charged successfully",
                        invoice: {
                            id: iid,
                            status: "paid",
                        },
                        paymentId: payment?.id,
                    });
                } catch (error) {
                    const failure = squareChargeFailure(error);
                    const transactionValues = {
                        memberId: invoice.memberId,
                        locationId: lid,
                        invoiceId: invoice.id,
                        description: invoice.description || `Invoice ${invoice.id}`,
                        type: "inbound" as const,
                        status: "failed" as const,
                        paymentType: "card" as const,
                        paymentMethodId: selectedPaymentMethodId,
                        paymentIntentId: failure.payment?.id,
                        total: invoice.total,
                        subTotal: invoice.subTotal,
                        tax: invoice.tax,
                        currency: invoice.currency || "usd",
                        feeAmount: chargeDetails.feesAmount,
                        failedCode: failure.code,
                        failedReason: failure.detail,
                        metadata: {
                            ...invoiceMetadata,
                            invoiceId: invoice.id,
                            gatewayService: "square" as const,
                            squarePaymentId: failure.payment?.id,
                            chargeId: failure.payment?.id,
                            squarePaymentStatus: failure.payment?.status ?? "FAILED",
                            squareErrorCode: failure.code,
                            squareErrorDetail: failure.detail,
                            squareErrorCategory: failure.category,
                            squareErrors: failure.errors,
                        },
                        items: invoice.items || [],
                        updated: new Date(),
                    };

                    const existingTransaction = await db.query.transactions.findFirst({
                        where: (transaction, { eq }) => eq(transaction.invoiceId, invoice.id),
                    });

                    if (existingTransaction) {
                        await db.update(transactions).set(transactionValues).where(eq(transactions.id, existingTransaction.id));
                    } else {
                        await db.insert(transactions).values(transactionValues);
                    }

                    return status(400, { error: failure.detail, code: failure.code });
                }
            }

            if (integration.service !== "stripe") {
                return status(400, { error: "Automatic invoice charging is not supported for this payment gateway" });
            }

            if (!integration.accountId) {
                return status(404, { error: "Stripe integration not found" });
            }

            const stripe = new StripePaymentGateway(integration.accessToken);

            let paymentMethod: { id: string; type: string } | undefined;

            if (paymentMethodId) {
                try {
                    paymentMethod = await stripe.retrievePaymentMethod(ml.gatewayCustomerId, paymentMethodId);
                } catch {
                    return status(400, { error: "Selected payment method cannot be used for automatic charging" });
                }
            } else {
                const customer = await stripe.getCustomer(ml.gatewayCustomerId);
                if (!customer) {
                    return status(404, { error: "Stripe customer not found" });
                }

                const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
                if (!defaultPaymentMethod) {
                    return status(400, { error: "No default payment method found for automatic charging" });
                }

                if (typeof defaultPaymentMethod === "string") {
                    try {
                        paymentMethod = await stripe.retrievePaymentMethod(ml.gatewayCustomerId, defaultPaymentMethod);
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

            const { id: paymentIntentId } = await stripe.createCharge(ml.gatewayCustomerId, selectedPaymentMethod.id, {
                total: chargeDetails.total,
                unitCost: chargeDetails.unitCost,
                tax: chargeDetails.tax,
                feesAmount: chargeDetails.feesAmount,
                description: invoice.description || `Invoice ${invoice.id}`,
                metadata: {
                    lid,
                    locationId: lid,
                    memberId: invoice.memberId,
                    invoiceId: invoice.id,
                    memberPlanId: invoice.memberPlanId || "",
                },
                productName: invoice.description || "Invoice",
                currency: (invoice.currency?.toUpperCase() || "USD") as Currency,
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

        if (invoice.paymentType !== "cash" && invoice.member && invoice.location) {
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
