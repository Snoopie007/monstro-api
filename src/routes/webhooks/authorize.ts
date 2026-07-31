import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, notInArray, or, sql } from "drizzle-orm";
import { Elysia } from "elysia";

import {
    cancelPendingEventRegistration,
    completePendingEventRegistration,
    createEventRegistration,
} from "@/handlers/event/shared";
import { db } from "@/db/db";
import {
    AuthorizePaymentGateway,
    type AuthorizeTransactionDetails,
} from "@/libs/PaymentGateway";
import { authorizeAuthenticationFromIntegration } from "@/libs/PaymentGateway/AuthorizeAuthentication";
import { scheduleCronBasedRenewal, scheduleRecursiveRenewal } from "@/queues/subscriptions";
import { createEnrollUnsignedDocs } from "@/utils";
import {
    courseEnrollments,
    eventRegistrations,
    eventTickets,
    locationEvents,
    memberInvoices,
    memberLocations,
    memberPackages,
    memberSubscriptions,
    orders,
    transactions,
} from "@subtrees/schemas";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import type { Integration } from "@subtrees/types";

const PAYMENT_EVENTS = new Set([
    "net.authorize.payment.authorization.created",
    "net.authorize.payment.authcapture.created",
    "net.authorize.payment.capture.created",
    "net.authorize.payment.fraud.approved",
    "net.authorize.payment.fraud.declined",
]);
const FOLLOW_ON_EVENTS = new Set([
    "net.authorize.payment.refund.created",
    "net.authorize.payment.void.created",
]);

type AuthorizeWebhookEvent = {
    eventType?: string;
    merchantAccountId?: string;
    payload?: {
        id?: string;
        entityName?: string;
        merchantAccountId?: string;
    };
};

type AuthorizeIntegration = Pick<
    Integration,
    "id" | "locationId" | "accountId" | "apiKey" | "secretKey" | "webhookSignatureKey" |
    "accessToken" | "refreshToken" | "expires" | "metadata"
>;

type Renewal = {
    startDate: Date;
    interval: "month" | "year";
    intervalThreshold: number;
    payload: SubscriptionJobData;
};

export function verifyAuthorizeWebhookSignature(rawBody: string, header: string | null, signatureKey: string | null) {
    const signature = header?.trim().replace(/^sha512=/i, "");
    const key = signatureKey?.trim();
    if (!signature || !key || !/^[0-9a-f]{128}$/i.test(key) || !/^[0-9a-f]{128}$/i.test(signature)) return false;
    const expected = createHmac("sha512", key).update(rawBody, "utf8").digest();
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
}

export function authorizePaymentState(details: AuthorizeTransactionDetails): "paid" | "pending" | "failed" | null {
    switch (details.transactionStatus) {
        case "settledSuccessfully":
        case "capturedPendingSettlement":
            return "paid";
        case "authorizedPendingCapture":
        case "FDSAuthorizedPendingReview":
        case "FDSPendingReview":
        case "pendingFinalSettlement":
            return "pending";
        case "declined":
        case "expired":
        case "failedReview":
        case "settlementError":
        case "voided":
            return "failed";
    }
    const responseCode = String(details.responseCode ?? "");
    return responseCode === "1" ? "paid"
        : responseCode === "4" ? "pending"
        : responseCode === "2" || responseCode === "3" ? "failed"
        : null;
}

function cents(value: unknown) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function metadataOf(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function dateFromMetadata(value: unknown, fallback: Date) {
    if (typeof value !== "string") return fallback;
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? fallback : date;
}

async function integrationForEvent(event: AuthorizeWebhookEvent, transaction?: typeof transactions.$inferSelect) {
    const metadata = metadataOf(transaction?.metadata);
    const integrationId = metadata.authorizeIntegrationId;
    if (typeof integrationId === "string") {
        return db.query.integrations.findFirst({
            where: (candidate, { and, eq }) => and(
                eq(candidate.id, integrationId),
                eq(candidate.locationId, transaction!.locationId),
                eq(candidate.service, "authorize"),
            ),
            columns: {
                id: true,
                locationId: true,
                accountId: true,
                apiKey: true,
                secretKey: true,
                webhookSignatureKey: true,
                accessToken: true,
                refreshToken: true,
                expires: true,
                metadata: true,
            },
        }) as Promise<AuthorizeIntegration | undefined>;
    }

    const merchantAccountId = event.payload?.merchantAccountId ?? event.merchantAccountId;
    if (!merchantAccountId) return undefined;
    return db.query.integrations.findFirst({
        where: (candidate, { and, eq }) => and(
            eq(candidate.accountId, merchantAccountId),
            eq(candidate.service, "authorize"),
        ),
        columns: {
            id: true,
            locationId: true,
            accountId: true,
            apiKey: true,
            secretKey: true,
            webhookSignatureKey: true,
            accessToken: true,
            refreshToken: true,
            expires: true,
            metadata: true,
        },
    }) as Promise<AuthorizeIntegration | undefined>;
}

async function transactionForDetails(
    providerTransactionId: string,
    integration: AuthorizeIntegration,
    details: AuthorizeTransactionDetails,
    direct?: typeof transactions.$inferSelect,
) {
    if (details.refTransId) {
        const original = await db.query.transactions.findFirst({
            where: and(
                eq(transactions.locationId, integration.locationId),
                or(
                    eq(transactions.paymentIntentId, details.refTransId),
                    sql`${transactions.metadata}->>'authorizeTransactionId' = ${details.refTransId}`,
                ),
            ),
        });
        if (original) return original;
    }
    if (direct) return direct;

    const match = typeof details.order?.description === "string"
        ? /^monstro:([A-Za-z0-9_-]{1,128})$/.exec(details.order.description)
        : null;
    if (!match?.[1]) return undefined;
    return db.query.transactions.findFirst({
        where: and(
            eq(transactions.id, match[1]),
            eq(transactions.locationId, integration.locationId),
            sql`${transactions.metadata}->>'gatewayService' = 'authorize'`,
        ),
    });
}

async function fulfillPlanCheckout(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    transaction: typeof transactions.$inferSelect,
    metadata: Record<string, unknown>,
): Promise<Renewal | undefined> {
    if (
        !transaction.memberId ||
        typeof metadata.memberPlanPricingId !== "string" ||
        typeof metadata.authorizeIntegrationId !== "string"
    ) {
        throw new Error("Authorize.net plan checkout metadata is incomplete");
    }
    const existingInvoice = await tx.query.memberInvoices.findFirst({
        where: eq(memberInvoices.transactionId, transaction.id),
    });
    if (existingInvoice) return undefined;

    const [pricing, memberLocation] = await Promise.all([
        tx.query.memberPlanPricing.findFirst({
            where: (candidate, { eq }) => eq(candidate.id, metadata.memberPlanPricingId as string),
            with: { plan: true },
        }),
        tx.query.memberLocations.findFirst({
            where: (candidate, { and, eq }) => and(
                eq(candidate.locationId, transaction.locationId),
                eq(candidate.memberId, transaction.memberId!),
            ),
            with: {
                member: true,
                location: { with: { taxRates: true, locationState: true } },
            },
        }),
    ]);
    if (!pricing?.plan || !memberLocation) throw new Error("Authorize.net plan checkout artifact is missing");

    const now = new Date();
    const discount = typeof metadata.discount === "number" ? metadata.discount : 0;
    const productName = typeof metadata.productName === "string" ? metadata.productName : pricing.name;
    const invoiceBase = {
        memberId: transaction.memberId,
        locationId: transaction.locationId,
        description: transaction.description,
        items: [{ name: productName, quantity: 1, price: transaction.subTotal, discount }],
        status: "paid" as const,
        paid: true,
        paymentType: transaction.paymentType,
        currency: transaction.currency,
        dueDate: now,
        transactionId: transaction.id,
        total: transaction.total,
        subTotal: transaction.subTotal,
        tax: transaction.tax,
    };

    if (metadata.checkoutKind === "package") {
        const startDate = dateFromMetadata(metadata.packageStartAt, now);
        const expireDate = typeof metadata.packageExpireAt === "string"
            ? dateFromMetadata(metadata.packageExpireAt, now)
            : undefined;
        const [memberPackage] = await tx.insert(memberPackages).values({
            locationId: transaction.locationId,
            memberId: transaction.memberId,
            totalClassLimit: typeof metadata.packageClassLimit === "number"
                ? metadata.packageClassLimit
                : pricing.plan.totalClassLimit ?? 0,
            memberPlanPricingId: pricing.id,
            paymentType: transaction.paymentType,
            startDate,
            expireDate,
            status: "active",
        }).returning({ id: memberPackages.id });
        if (!memberPackage) throw new Error("Authorize.net package could not be finalized");
        await tx.insert(memberInvoices).values({ ...invoiceBase, memberPlanId: memberPackage.id });
        await createEnrollUnsignedDocs(tx, {
            mid: transaction.memberId,
            lid: transaction.locationId,
            memberPlanId: memberPackage.id,
            contractId: pricing.plan.contractId,
            waiverId: memberLocation.location.locationState.waiverId,
            signedWaiverId: memberLocation.signedWaiverId,
        });
        return undefined;
    }

    if (metadata.checkoutKind !== "subscription") return undefined;
    if (!pricing.interval || !pricing.intervalThreshold) throw new Error("Authorize.net subscription pricing is incomplete");
    const gatewayCustomerId = typeof metadata.authorizeCustomerProfileId === "string"
        ? metadata.authorizeCustomerProfileId
        : memberLocation.gatewayCustomerId;
    if (!gatewayCustomerId) throw new Error("Authorize.net customer profile ID is missing");
    const startDate = dateFromMetadata(metadata.subscriptionStartAt, now);
    const currentPeriodEnd = dateFromMetadata(metadata.subscriptionCurrentPeriodEnd, now);
    const cancelAt = typeof metadata.subscriptionCancelAt === "string"
        ? dateFromMetadata(metadata.subscriptionCancelAt, now)
        : undefined;
    const trialEnd = typeof metadata.subscriptionTrialEnd === "string"
        ? dateFromMetadata(metadata.subscriptionTrialEnd, now)
        : undefined;
    const allowProration = metadata.subscriptionAllowProration === true;
    const [subscription] = await tx.insert(memberSubscriptions).values({
        startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd,
        locationId: transaction.locationId,
        memberId: transaction.memberId,
        cancelAt,
        trialEnd,
        classCredits: typeof metadata.classCredits === "number" ? metadata.classCredits : 0,
        status: "active",
        paymentType: transaction.paymentType,
        gatewayPaymentId: transaction.paymentMethodId,
        metadata: {
            gatewayIntegrationId: metadata.authorizeIntegrationId,
            gatewayCustomerId,
            allowProration,
        },
        memberPlanPricingId: pricing.id,
    }).returning();
    if (!subscription) throw new Error("Authorize.net subscription could not be finalized");
    await tx.insert(memberInvoices).values({
        ...invoiceBase,
        memberPlanId: subscription.id,
        forPeriodStart: subscription.currentPeriodStart,
        forPeriodEnd: subscription.currentPeriodEnd,
    });
    await createEnrollUnsignedDocs(tx, {
        mid: transaction.memberId,
        lid: transaction.locationId,
        memberPlanId: subscription.id,
        contractId: pricing.plan.contractId,
        waiverId: memberLocation.location.locationState.waiverId,
        signedWaiverId: memberLocation.signedWaiverId,
    });

    if (!(["month", "year"] as string[]).includes(pricing.interval)) return undefined;
    return {
        startDate: currentPeriodEnd,
        interval: pricing.interval as "month" | "year",
        intervalThreshold: pricing.intervalThreshold,
        payload: {
            sid: subscription.id,
            lid: transaction.locationId,
            member: {
                firstName: memberLocation.member.firstName,
                lastName: memberLocation.member.lastName,
                email: memberLocation.member.email,
            },
            taxRate: memberLocation.location.taxRates.find((rate) => rate.isDefault)?.percentage || 0,
            location: {
                name: memberLocation.location.name,
                phone: memberLocation.location.phone,
                email: memberLocation.location.email,
            },
            pricing: {
                name: pricing.name,
                price: pricing.price,
                interval: pricing.interval,
                intervalThreshold: pricing.intervalThreshold,
            },
            discount: discount > 0 ? { amount: discount, duration: pricing.intervalThreshold } : undefined,
        },
    };
}

async function scheduleRenewal(renewal: Renewal) {
    if (renewal.intervalThreshold === 1) {
        await scheduleCronBasedRenewal({
            startDate: renewal.startDate,
            interval: renewal.interval,
            data: renewal.payload,
        });
        return;
    }
    await scheduleRecursiveRenewal({
        startDate: renewal.startDate,
        data: { ...renewal.payload, recurrenceCount: 1 },
    });
}

export function authorizeWebhookRoutes(app: Elysia) {
    app.post("/authorize", async ({ request, status }) => {
        const rawBody = await request.text();
        let event: AuthorizeWebhookEvent;
        try {
            const parsed: unknown = JSON.parse(rawBody);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                return status(400, { error: "Invalid Authorize.net payload" });
            }
            event = parsed as AuthorizeWebhookEvent;
        } catch {
            return status(400, { error: "Invalid Authorize.net payload" });
        }
        if (
            !event.eventType
            || (!PAYMENT_EVENTS.has(event.eventType) && !FOLLOW_ON_EVENTS.has(event.eventType))
            || event.payload?.entityName !== "transaction"
        ) {
            return status(200, { message: "Authorize.net event ignored" });
        }

        const providerTransactionId = event.payload.id;
        if (!providerTransactionId) return status(400, { error: "Authorize.net transaction ID is missing" });

        const direct = await db.query.transactions.findFirst({
            where: and(
                sql`${transactions.metadata}->>'gatewayService' = 'authorize'`,
                or(
                    eq(transactions.paymentIntentId, providerTransactionId),
                    sql`${transactions.metadata}->>'authorizeTransactionId' = ${providerTransactionId}`,
                ),
            ),
        });
        const integration = await integrationForEvent(event, direct);
        if (!integration) {
            return status(401, { error: "Authorize.net webhook merchant is unknown" });
        }
        if (!verifyAuthorizeWebhookSignature(
            rawBody,
            request.headers.get("x-anet-signature"),
            integration.webhookSignatureKey,
        )) {
            return status(401, { error: "Invalid Authorize.net webhook signature" });
        }

        let authentication;
        try {
            authentication = await authorizeAuthenticationFromIntegration(integration);
        } catch (error) {
            console.error("Unable to authenticate Authorize.net webhook reconciliation", error);
            return status(503, { error: "Authorize.net integration is unavailable" });
        }
        const authorize = new AuthorizePaymentGateway(authentication);
        let details: AuthorizeTransactionDetails;
        try {
            details = await authorize.getTransactionDetails(providerTransactionId);
        } catch (error) {
            console.error("Unable to reconcile Authorize.net webhook", error);
            return status(503, { error: "Authorize.net transaction could not be verified" });
        }
        const transaction = await transactionForDetails(providerTransactionId, integration, details, direct);
        if (!transaction) return status(200, { message: "Authorize.net transaction not found" });

        const isFollowOn = FOLLOW_ON_EVENTS.has(event.eventType)
            || details.transactionType === "refundTransaction"
            || details.transactionType === "voidTransaction";
        const providerAmount = cents(details.authAmount ?? details.settleAmount ?? details.amount);
        if (providerAmount === null || (isFollowOn ? providerAmount > transaction.total : providerAmount !== transaction.total)) {
            return status(400, { error: "Authorize.net amount does not match" });
        }
        if (details.currencyCode && details.currencyCode.toUpperCase() !== transaction.currency.toUpperCase()) {
            return status(400, { error: "Authorize.net currency does not match" });
        }

        let renewal: Renewal | undefined;
        await db.transaction(async (tx) => {
            await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${transaction.id}))`);
            const current = await tx.query.transactions.findFirst({
                where: eq(transactions.id, transaction.id),
            });
            if (!current) throw new Error("Authorize.net transaction disappeared during reconciliation");
            const currentMetadata = metadataOf(current.metadata);

            if (isFollowOn) {
                const ids = Array.isArray(currentMetadata.authorizeRefundTransactionIds)
                    ? currentMetadata.authorizeRefundTransactionIds.filter((id): id is string => typeof id === "string")
                    : [];
                if (ids.includes(providerTransactionId)) return;
                const operation = details.transactionType === "voidTransaction" || event.eventType === "net.authorize.payment.void.created"
                    ? "void"
                    : "refund";
                await tx.update(transactions).set({
                    refunded: true,
                    refundedAmount: operation === "void" ? current.refundedAmount : Math.min(current.total, current.refundedAmount + providerAmount),
                    metadata: {
                        ...currentMetadata,
                        authorizeRefundState: "completed",
                        authorizeRefundOperation: operation,
                        authorizeRefundTransactionId: providerTransactionId,
                        authorizeRefundTransactionIds: [...ids, providerTransactionId],
                        authorizeRefundStatus: details.transactionStatus,
                    },
                    updated: new Date(),
                }).where(eq(transactions.id, current.id));
                if (operation === "void" || providerAmount >= current.total) {
                    await tx.update(memberInvoices).set({ status: "void", paid: false, updated: new Date() })
                        .where(eq(memberInvoices.transactionId, current.id));
                }
                return;
            }

            const paymentStatus = authorizePaymentState(details);
            if (!paymentStatus) throw new Error("Unknown Authorize.net transaction status");
            const metadata: Record<string, unknown> = {
                ...currentMetadata,
                authorizeTransactionId: providerTransactionId,
                authorizeResponseCode: String(details.responseCode ?? ""),
                authorizeProviderStatus: details.transactionStatus,
            };
            const terminalTransition = paymentStatus !== "pending" && current.status !== paymentStatus;
            await tx.update(transactions).set({
                status: paymentStatus,
                paymentIntentId: providerTransactionId,
                failedCode: paymentStatus === "failed" ? String(details.responseReasonCode ?? details.responseCode ?? "AUTHORIZE_FAILED") : null,
                failedReason: paymentStatus === "failed" ? details.responseReasonDescription ?? "Authorize.net payment failed" : null,
                metadata,
                updated: new Date(),
            }).where(eq(transactions.id, current.id));

            const invoice = await tx.query.memberInvoices.findFirst({
                where: eq(memberInvoices.transactionId, current.id),
            });
            if (invoice && terminalTransition) {
                await tx.update(memberInvoices).set({
                    status: paymentStatus === "paid" ? "paid" : "unpaid",
                    paid: paymentStatus === "paid",
                    paymentType: "card",
                    updated: new Date(),
                }).where(eq(memberInvoices.id, invoice.id));
            }
            const subscriptionId = typeof metadata.memberSubscriptionId === "string"
                ? metadata.memberSubscriptionId
                : null;
            if (subscriptionId && terminalTransition) {
                const [updatedSubscription] = await tx.update(memberSubscriptions).set({
                    status: paymentStatus === "paid" ? "active" : "past_due",
                    updated: new Date(),
                }).where(and(
                    eq(memberSubscriptions.id, subscriptionId),
                    notInArray(memberSubscriptions.status, ["canceled", "paused", "incomplete_expired"]),
                )).returning({ id: memberSubscriptions.id });
                if (updatedSubscription && paymentStatus === "paid" && current.memberId) {
                    await tx.update(memberLocations).set({ status: "active", updated: new Date() })
                        .where(and(
                            eq(memberLocations.memberId, current.memberId),
                            eq(memberLocations.locationId, current.locationId),
                        ));
                }
            }
            if (terminalTransition && paymentStatus === "failed" && metadata.checkoutKind === "order") {
                await tx.update(orders).set({ status: "cancelled", updated: new Date() })
                    .where(eq(orders.transactionId, current.id));
            }
            if (terminalTransition && paymentStatus === "failed" && metadata.checkoutKind === "event") {
                await cancelPendingEventRegistration(tx, current.id);
            }
            if (paymentStatus !== "paid" || !terminalTransition) return;

            switch (metadata.checkoutKind) {
                case "order": {
                    const [order] = await tx.update(orders).set({
                        status: "paid",
                        gatewayPaymentId: providerTransactionId,
                        updated: new Date(),
                    }).where(eq(orders.transactionId, current.id)).returning({ id: orders.id });
                    if (!order) throw new Error("Authorize.net order artifact is missing");
                    return;
                }
                case "course": {
                    if (typeof metadata.courseId !== "string" || !current.memberId) {
                        throw new Error("Authorize.net course artifact metadata is incomplete");
                    }
                    const existing = await tx.query.courseEnrollments.findFirst({
                        where: eq(courseEnrollments.transactionId, current.id),
                    });
                    if (existing) return;
                    const [enrollment] = await tx.insert(courseEnrollments).values({
                        memberId: current.memberId,
                        locationId: current.locationId,
                        courseId: metadata.courseId,
                        transactionId: current.id,
                        enrolledAt: new Date(),
                    }).onConflictDoNothing().returning({ id: courseEnrollments.id });
                    if (!enrollment) throw new Error("Authorize.net course artifact could not be finalized");
                    return;
                }
                case "event": {
                    if (typeof metadata.eventId !== "string" || typeof metadata.ticketId !== "string" || !current.memberId) {
                        throw new Error("Authorize.net event artifact metadata is incomplete");
                    }
                    const existing = await tx.query.eventRegistrations.findFirst({
                        where: eq(eventRegistrations.transactionId, current.id),
                    });
                    if (existing) {
                        if (existing.status === "pending") {
                            await completePendingEventRegistration(tx, current.id);
                        }
                        return;
                    }
                    const eventRecord = await tx.query.locationEvents.findFirst({ where: eq(locationEvents.id, metadata.eventId) });
                    const ticket = await tx.query.eventTickets.findFirst({ where: eq(eventTickets.id, metadata.ticketId) });
                    if (!eventRecord || !ticket) throw new Error("Authorize.net event artifact is missing");
                    await createEventRegistration(tx, {
                        lid: current.locationId,
                        mid: current.memberId,
                        event: eventRecord,
                        ticket,
                        transactionId: current.id,
                        status: "registered",
                    });
                    return;
                }
                case "package":
                case "subscription":
                    renewal = await fulfillPlanCheckout(tx, current, metadata);
                    return;
                case undefined:
                    return;
                default:
                    throw new Error(`Unknown Authorize.net artifact kind: ${String(metadata.checkoutKind)}`);
            }
        });
        if (renewal) await scheduleRenewal(renewal);

        return status(200, { message: "Authorize.net event processed" });
    }, { parse: "none" });
    return app;
}
