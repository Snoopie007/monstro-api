import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { paymentFailureFromError } from "@/subtrees/utils/workflow/payments";
import { dispatchPaymentFailed } from "@/subtrees/utils/server/workflows";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails } from "@/utils/enrollUtils";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { memberInvoices, transactions } from "@/subtrees/schemas";
import { scheduleInvoiceReminderAndOverdue } from "./shared";
import type { Currency } from "square";
import { canEditLocationMember } from "@/utils/locationAccess";
import { sendCashInvoice } from "./cashEmail";
import { CashInvoiceError } from "@/subtrees/utils/server/cashInvoices";

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
    return app.post("/:iid/send", async ctx => {
        const { params, body, status } = ctx;
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

        if (invoice.paymentType === "cash") {
            const actor = ctx as typeof ctx & { vendorId?: string; staffId?: string; userId?: string };
            if (!await canEditLocationMember(lid, actor)) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
            try {
                const sent = await sendCashInvoice(lid, iid);
                return status(200, { success: true, message: sent.emailQueued ? "Invoice email queued" : "Invoice already issued", invoice: sent });
            } catch (error) {
                if (error instanceof CashInvoiceError) return status(error.code === "INVOICE_NOT_FOUND" ? 404 : 400, { error: error.message, code: error.code });
                console.error("Failed to queue cash invoice email", error);
                return status(503, { error: "Could not queue the invoice email. Please retry." });
            }
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
        const shouldAutoCharge = collectionMethod === "charge_automatically";
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
        if (linkedSubscription && shouldAutoCharge) {
            return status(400, {
                error: "Subscription-linked automatic invoices must use the subscription payment retry flow",
                code: "SUBSCRIPTION_RETRY_REQUIRED",
            });
        }
        const billingCustomerId = ml?.gatewayCustomerId || "";

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
            const integration = invoice.location?.integrations?.find((candidate) => {
                if (invoiceMetadata?.gatewayService) return candidate.service === invoiceMetadata.gatewayService;
                return candidate.id === invoice.location?.locationState?.paymentGatewayId;
            }) ?? invoice.location?.integrations?.[0];
            if (!integration || !integration.accessToken) {
                return status(404, { error: "Payment gateway integration not found" });
            }

            if (integration.service === "square") {
                const selectedPaymentMethodId = paymentMethodId
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

                    await db.transaction(async (tx) => {
                        let transactionId = invoice.transactionId;
                        if (transactionId) {
                            await tx.update(transactions).set(transactionValues).where(eq(transactions.id, transactionId));
                        } else {
                            const [transaction] = await tx.insert(transactions).values(transactionValues).returning({ id: transactions.id });
                            assert(transaction);
                            transactionId = transaction.id;
                            await tx.update(memberInvoices).set({ transactionId }).where(eq(memberInvoices.id, invoice.id));
                        }
                        if (paymentFailureFromError(error)) await dispatchPaymentFailed(tx, transactionId);
                    });

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
            }).catch(async (error) => {
                const failure = paymentFailureFromError(error);
                if (!failure) throw error;
                // Record the explicit decline before preserving the route's original error response.
                await db.transaction(async (tx) => {
                    const values = {
                        memberId: invoice.memberId, locationId: lid, type: "inbound" as const,
                        status: "failed" as const, total: invoice.total, subTotal: invoice.subTotal,
                        tax: invoice.tax, currency: invoice.currency || "USD",
                        paymentType: selectedPaymentMethod.type, paymentMethodId: selectedPaymentMethod.id,
                        paymentIntentId: failure.paymentIntentId,
                        failedReason: failure.failureReason, failedCode: failure.failureCode,
                        metadata: { ...invoiceMetadata, ...failure.gatewayMetadata },
                    };
                    let transactionId = invoice.transactionId;
                    if (transactionId) {
                        await tx.update(transactions).set(values).where(eq(transactions.id, transactionId));
                    } else {
                        const [created] = await tx.insert(transactions).values(values).returning({ id: transactions.id });
                        assert(created);
                        transactionId = created.id;
                        await tx.update(memberInvoices).set({ transactionId }).where(eq(memberInvoices.id, invoice.id));
                    }
                    await dispatchPaymentFailed(tx, transactionId);
                });
                throw error;
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
