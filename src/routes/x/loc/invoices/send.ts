import { strict as assert } from "node:assert";
import { invoiceQueue } from "@/queues";
import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails } from "@/utils/enrollUtils";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { scheduleInvoiceReminderAndOverdue } from "./shared";
import { BillingContextError, resolveSubscriptionBillingContext } from "../subscriptions/billingContext";
import type { SubscriptionBillingContext } from "../subscriptions/billingContext";
import type { Currency } from "square";

type InvoiceChargeMetadata = {
    collectionMethod?: "send_invoice" | "charge_automatically";
    paymentMethodId?: string;
    gatewayService?: "stripe" | "square";
    platformFeeAmount?: number;
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
            where: (memberLocation, { eq, and }) => and(
                eq(memberLocation.locationId, lid),
                eq(memberLocation.memberId, invoice.memberId),
            ),
            columns: { gatewayCustomerId: true },
        });
        const invoiceMetadata = (invoice.metadata as InvoiceChargeMetadata | null) ?? null;
        const collectionMethod = invoiceMetadata?.collectionMethod || "send_invoice";
        const shouldAutoCharge = collectionMethod === "charge_automatically" && invoice.paymentType !== "cash";
        const linkedTransaction = invoice.transactionId
            ? await db.query.transactions.findFirst({
                where: (transaction, { eq }) => eq(transaction.id, invoice.transactionId!),
                columns: { feeAmount: true },
            })
            : undefined;
        const linkedSubscription = invoice.memberPlanId
            ? await db.query.memberSubscriptions.findFirst({
                where: (sub, { and, eq }) => and(
                    eq(sub.id, invoice.memberPlanId!),
                    eq(sub.locationId, lid),
                    eq(sub.memberId, invoice.memberId),
                ),
                columns: {
                    id: true,
                    memberId: true,
                    locationId: true,
                    parentId: true,
                    metadata: true,
                    gatewayPaymentId: true,
                },
            })
            : null;
        if (invoice.memberPlanId && !linkedSubscription) {
            return status(404, { error: "Linked subscription not found", code: "SUBSCRIPTION_NOT_FOUND" });
        }
        if (linkedSubscription?.parentId) {
            return status(400, { error: "Only a root subscription can collect payment", code: "SUBSCRIPTION_CHILD" });
        }
        if (!linkedSubscription && !ml) {
            return status(404, { error: "Member location or gateway customer not found" });
        }
        let billingContext: SubscriptionBillingContext | null = null;
        let billingCustomerId = ml?.gatewayCustomerId || "";
        if (linkedSubscription && shouldAutoCharge) {
            try {
                billingContext = await resolveSubscriptionBillingContext(linkedSubscription, {
                    paymentMethodId,
                    requirePaymentMethod: true,
                });
                billingCustomerId = billingContext.gatewayCustomerId;
            } catch (error) {
                if (error instanceof BillingContextError) {
                    const statusCode = ["GATEWAY_NOT_FOUND", "GATEWAY_NOT_CONFIGURED"].includes(error.code) ? 404 : 400;
                    return status(statusCode, { error: error.message, code: error.code });
                }
                throw error;
            }
        }

        if (shouldAutoCharge) {
            if (!billingCustomerId) {
                return status(404, { error: "Subscription billing customer not found" });
            }
            const additionalFeeTax = (invoice.items || []).reduce(
                (total, item) => item.feeId ? total + (item.tax || 0) : total,
                0,
            );
            const platformFeeAmount = linkedTransaction?.feeAmount
                ?? invoiceMetadata?.platformFeeAmount
                ?? calculateChargeDetails({
                    amount: invoice.subTotal,
                    discount: 0,
                    taxRate: 0,
                    taxAmount: Math.max(0, invoice.tax - additionalFeeTax),
                    planId: invoice.location?.locationState?.planId ?? 0,
                    additionalFees: [],
                }).feesAmount;
            const integration = billingContext?.gateway ?? invoice.location?.integrations?.find((candidate) => {
                if (invoiceMetadata?.gatewayService) return candidate.service === invoiceMetadata.gatewayService;
                return candidate.id === invoice.location?.locationState?.paymentGatewayId;
            }) ?? invoice.location?.integrations?.[0];
            if (!integration || !integration.accessToken) {
                return status(404, { error: "Payment gateway integration not found" });
            }
            if (billingContext && linkedSubscription) {
                const selectedPaymentMethodId = billingContext.paymentMethodId;
                const paymentType = billingContext.paymentMethodType as PaymentType | null;
                if (!selectedPaymentMethodId || !paymentType) {
                    return status(400, { error: "Subscription payment method is missing", code: "PAYMENT_METHOD_MISSING" });
                }
                if (!invoice.member || !invoice.location) {
                    return status(404, { error: "Invoice member or location not found" });
                }
                const now = new Date();
                const preparedInvoice = await db.transaction(async (tx) => {
                    const [current] = await tx.select({
                        status: memberInvoices.status,
                        paid: memberInvoices.paid,
                        metadata: memberInvoices.metadata,
                    }).from(memberInvoices)
                        .where(eq(memberInvoices.id, iid))
                        .for("update");
                    if (!current || current.status !== "draft" || current.paid) return null;
                    const currentMetadata = current.metadata && typeof current.metadata === "object"
                        ? current.metadata as Record<string, unknown>
                        : {};
                    if ("billingAttempt" in currentMetadata) return null;
                    const metadata = {
                        ...currentMetadata,
                        collectionMethod: "charge_automatically" as const,
                        paymentMethodId: selectedPaymentMethodId,
                        gatewayService: integration.service as "stripe" | "square",
                        platformFeeAmount,
                    };
                    const [updated] = await tx.update(memberInvoices).set({
                        paymentType,
                        metadata,
                        updated: new Date(),
                    }).where(and(
                        eq(memberInvoices.id, iid),
                        eq(memberInvoices.status, "draft"),
                    )).returning({ id: memberInvoices.id });
                    return updated ?? null;
                });
                if (!preparedInvoice) {
                    return status(409, { error: "Invoice is no longer pending send", code: "INVOICE_STATE_CHANGED" });
                }

                const jobId = `invoice-subscription-${iid}`;
                await invoiceQueue.add("subscription:invoice", {
                    invoiceId: iid,
                    memberId: invoice.memberId,
                    locationId: lid,
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
                }, {
                    jobId,
                    attempts: 3,
                    backoff: { type: "exponential", delay: 5000 },
                });

                await db.update(memberInvoices).set({
                    status: "unpaid",
                    paid: false,
                    sentAt: now,
                    updated: new Date(),
                }).where(and(
                    eq(memberInvoices.id, iid),
                    eq(memberInvoices.status, "draft"),
                    eq(memberInvoices.paid, false),
                ));
                return status(202, {
                    success: true,
                    message: "Invoice charge queued",
                    invoice: { id: iid, status: "unpaid" },
                    jobId,
                });
            }

            if (integration.service === "square") {
                const selectedPaymentMethodId = billingContext?.paymentMethodId
                    ?? paymentMethodId
                    ?? invoiceMetadata?.paymentMethodId;
                if (!selectedPaymentMethodId) {
                    return status(400, { error: "Selected Square payment method is required for automatic charging" });
                }

                if (billingCustomerId.startsWith("cus_")) {
                    return status(400, { error: "Member location does not have a Square customer ID" });
                }

                const squareLocationId = squareLocationIdFromMetadata(integration.metadata);
                if (!squareLocationId) {
                    return status(400, { error: "Square location ID not found" });
                }

                const square = new SquarePaymentGateway(integration.accessToken);

                try {
                    const payment = await square.createCharge(billingCustomerId, selectedPaymentMethodId, {
                        total: invoice.total,
                        feesAmount: platformFeeAmount,
                        currency: (invoice.currency?.toUpperCase() || "USD") as Currency,
                        referenceId: invoice.id,
                        squareLocationId,
                        note: `${invoice.description || `Invoice ${invoice.id}`}|invId:${invoice.id}|mid:${invoice.memberId}|lid:${lid}|pmid:${selectedPaymentMethodId}`,
                    });

                    const transactionValues = {
                        memberId: invoice.memberId,
                        locationId: lid,
                        description: invoice.description || `Invoice ${invoice.id}`,
                        type: "inbound" as const,
                        status: "paid" as const,
                        paymentType: "card" as const,
                        paymentMethodId: selectedPaymentMethodId,
                        paymentIntentId: payment?.id,
                        total: invoice.total,
                        subTotal: invoice.subTotal,
                        tax: invoice.tax,
                        currency: (invoice.currency?.toUpperCase() || "USD") as Currency,
                        feeAmount: platformFeeAmount,
                        failedCode: null,
                        failedReason: null,
                        metadata: {
                            ...invoiceMetadata,
                            gatewayService: "square" as const,
                            paymentMethodId: selectedPaymentMethodId,
                            squarePaymentId: payment?.id,
                            chargeId: payment?.id,
                            squarePaymentStatus: payment?.status,
                        },
                        items: invoice.items || [],
                        updated: new Date(),
                    };

                    let transactionId = invoice.transactionId;
                    if (transactionId) {
                        await db.update(transactions).set(transactionValues).where(eq(transactions.id, transactionId));
                    } else {
                        const [transaction] = await db.insert(transactions).values(transactionValues).returning({ id: transactions.id });
                        assert(transaction);
                        transactionId = transaction.id;
                    }

                    await db.update(memberInvoices).set({
                        status: "paid",
                        paid: true,
                        transactionId,
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
                        description: invoice.description || `Invoice ${invoice.id}`,
                        type: "inbound" as const,
                        status: "failed" as const,
                        paymentType: "card" as const,
                        paymentMethodId: selectedPaymentMethodId,
                        paymentIntentId: failure.payment?.id,
                        total: invoice.total,
                        subTotal: invoice.subTotal,
                        tax: invoice.tax,
                        currency: (invoice.currency?.toUpperCase() || "USD") as Currency,
                        feeAmount: platformFeeAmount,
                        failedCode: failure.code,
                        failedReason: failure.detail,
                        metadata: {
                            ...invoiceMetadata,
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

                    if (invoice.transactionId) {
                        await db.update(transactions).set(transactionValues).where(eq(transactions.id, invoice.transactionId));
                    } else {
                        const [transaction] = await db.insert(transactions).values(transactionValues).returning({ id: transactions.id });
                        assert(transaction);
                        await db.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));
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

            if (billingContext?.paymentMethodId && billingContext.paymentMethodType) {
                paymentMethod = {
                    id: billingContext.paymentMethodId,
                    type: billingContext.paymentMethodType,
                };
            } else if (paymentMethodId) {
                try {
                    paymentMethod = await stripe.retrievePaymentMethod(billingCustomerId, paymentMethodId);
                } catch {
                    return status(400, { error: "Selected payment method cannot be used for automatic charging" });
                }
            } else {
                const customer = await stripe.getCustomer(billingCustomerId);
                if (!customer) {
                    return status(404, { error: "Stripe customer not found" });
                }

                const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
                if (!defaultPaymentMethod) {
                    return status(400, { error: "No default payment method found for automatic charging" });
                }

                if (typeof defaultPaymentMethod === "string") {
                    try {
                        paymentMethod = await stripe.retrievePaymentMethod(billingCustomerId, defaultPaymentMethod);
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
            if (!["card", "us_bank_account", "link", "cashapp"].includes(paymentMethod.type)) {
                return status(400, {
                    error: paymentMethodId
                        ? "Selected payment method cannot be used for automatic charging"
                        : "Default payment method cannot be used for automatic charging",
                });
            }

            const selectedPaymentMethod = {
                id: paymentMethod.id,
                type: paymentMethod.type as "card" | "us_bank_account" | "link" | "cashapp",
            };

            const { id: paymentIntentId } = await stripe.createCharge(billingCustomerId, selectedPaymentMethod.id, {
                total: invoice.total,
                unitCost: invoice.subTotal,
                tax: invoice.tax,
                feesAmount: platformFeeAmount,
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
