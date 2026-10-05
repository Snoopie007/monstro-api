import type { integrations } from "@/subtrees/schemas";
import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import { StripePaymentGateway, SquarePaymentGateway, AuthorizePaymentGateway } from "@/libs/PaymentGateway";
import { getStripeMigration } from "@/subtrees/utils/subscriptionBilling";

export type SupportedStripePaymentMethod = "card" | "us_bank_account" | "link" | "cashapp";
export type SubscriptionBillingContext = {
    gateway: {
        id: string;
        integrationId: string;
        locationId: string;
        service: string;
        accessToken: string;
        accountId: string;
        metadata?: Record<string, unknown> | null;
    };
    gatewayCustomerId: string;
    paymentMethodId: string | null;
    paymentMethodType: SupportedStripePaymentMethod | "card" | null;
};

type SubscriptionLike = {
    id: string;
    parentId?: string | null;
    locationId?: string | null;
    memberId: string;
    metadata?: Record<string, unknown> | null;
    gatewayPaymentId?: string | null;
};

export async function resolveSubscriptionBillingContext(
    subscription: SubscriptionLike,
    options: { paymentMethodId?: string; requirePaymentMethod?: boolean } = {},
): Promise<SubscriptionBillingContext> {
    if (subscription.parentId) {
        throw new BillingContextError("Only a root subscription can collect payment", "SUBSCRIPTION_CHILD");
    }
    if (!subscription.locationId) {
        throw new BillingContextError("Subscription location is missing", "LOCATION_MISSING");
    }

    const [state, memberLocation] = await Promise.all([
        db.query.locationState.findFirst({
            where: (row, { eq: equals }) => equals(row.locationId, subscription.locationId!),
            columns: { paymentGatewayId: true },
        }),
        db.query.memberLocations.findFirst({
            where: (row, { and: andFn, eq: equals }) => andFn(
                equals(row.locationId, subscription.locationId!),
                equals(row.memberId, subscription.memberId),
            ),
            columns: { gatewayCustomerId: true },
        }),
    ]);

    const metadata = subscription.metadata ?? {};
    const gatewayId = typeof metadata.gatewayIntegrationId === "string" && metadata.gatewayIntegrationId.length > 0
        ? metadata.gatewayIntegrationId
        : state?.paymentGatewayId;
    const gateway = gatewayId
        ? await db.query.integrations.findFirst({
            where: (row, { eq: equals }) => equals(row.id, gatewayId),
            columns: {
                id: true,
                locationId: true,
                service: true,
                accessToken: true, apiKey: true, secretKey: true,
                accountId: true,
                metadata: true,
            },
        })
        : await db.query.integrations.findFirst({
            where: (row, { eq: equals, and: andFn }) => andFn(
                equals(row.locationId, subscription.locationId!),
                equals(row.service, typeof metadata.gatewayService === "string" && metadata.gatewayService.length > 0
                    ? metadata.gatewayService
                    : "stripe"),
            ),
            columns: {
                id: true,
                locationId: true,
                service: true,
                accessToken: true, apiKey: true, secretKey: true,
                accountId: true,
                metadata: true,
            },
        });

    if (!gateway || gateway.locationId !== subscription.locationId) {
        throw new BillingContextError("Payment gateway integration not found", "GATEWAY_NOT_FOUND");
    }
    if (gateway.service !== "authorize" && (!gateway.accessToken || !gateway.accountId)) {
        throw new BillingContextError("Payment gateway integration is not configured", "GATEWAY_NOT_CONFIGURED");
    }

    const gatewayCustomerId = typeof metadata.gatewayCustomerId === "string" && metadata.gatewayCustomerId.length > 0
        ? metadata.gatewayCustomerId
        : memberLocation?.gatewayCustomerId ?? null;
    if (!gatewayCustomerId) {
        throw new BillingContextError("Subscription billing customer is missing", "CUSTOMER_MISSING");
    }

    const selectedMethodId = options.paymentMethodId
        ?? subscription.gatewayPaymentId
        ?? (typeof metadata.paymentMethodId === "string" && metadata.paymentMethodId.length > 0
            ? metadata.paymentMethodId
            : null);
    if (gateway.service === "authorize" && getDeferredBilling(subscription.metadata)) {
        return resolveAuthorizePaymentMethod(gateway, gatewayCustomerId, selectedMethodId);
    }

    if (gateway.service === "stripe") {
        if (!selectedMethodId && options.requirePaymentMethod !== false) {
            throw new BillingContextError("Subscription payment method is missing", "PAYMENT_METHOD_MISSING");
        }
        let paymentMethodId = selectedMethodId;
        let paymentMethodType: SupportedStripePaymentMethod | null = null;
        const stripe = new StripePaymentGateway(gateway.accessToken!);
        if (!paymentMethodId) {
            const customer = await stripe.getCustomer(gatewayCustomerId);
            const defaultMethod = customer?.invoice_settings?.default_payment_method;
            paymentMethodId = typeof defaultMethod === "string" ? defaultMethod : defaultMethod?.id ?? null;
        }
        if (paymentMethodId) {
            let method: { id: string; type: string };
            try {
                method = await stripe.retrievePaymentMethod(gatewayCustomerId, paymentMethodId);
            } catch (error) {
                const stripeError = error as { code?: string; statusCode?: number };
                if (stripeError.code === "resource_missing" || stripeError.statusCode === 404) {
                    throw new BillingContextError("Payment method does not belong to subscription customer", "PAYMENT_METHOD_OWNER_MISMATCH");
                }
                throw error;
            }
            if (!["card", "us_bank_account", "link", "cashapp"].includes(method.type)) {
                throw new BillingContextError("Unsupported Stripe payment method", "PAYMENT_METHOD_UNSUPPORTED");
            }
            paymentMethodType = method.type as SupportedStripePaymentMethod;
        }
        return {
            gateway: {
                ...gateway,
                integrationId: gateway.id,
                accessToken: gateway.accessToken!,
            },
            gatewayCustomerId,
            paymentMethodId,
            paymentMethodType,
        };
    }

    if (gateway.service === "square") {
        if (!selectedMethodId) {
            throw new BillingContextError("Subscription payment method is missing", "PAYMENT_METHOD_MISSING");
        }
        if (gatewayCustomerId.startsWith("cus_")) {
            throw new BillingContextError("Subscription does not have a Square customer ID", "CUSTOMER_GATEWAY_MISMATCH");
        }
        try {
            await new SquarePaymentGateway(gateway.accessToken!).retrieveCardForCustomer(gatewayCustomerId, selectedMethodId);
        } catch {
            throw new BillingContextError("Payment method does not belong to subscription customer", "PAYMENT_METHOD_OWNER_MISMATCH");
        }
        return {
            gateway: {
                ...gateway,
                integrationId: gateway.id,
                accessToken: gateway.accessToken!,
            },
            gatewayCustomerId,
            paymentMethodId: selectedMethodId,
            paymentMethodType: "card",
        };
    }

    throw new BillingContextError("Unsupported payment gateway for subscriptions", "GATEWAY_UNSUPPORTED");
}

type AuthorizeGateway = Pick<typeof integrations.$inferSelect,
    "id" | "locationId" | "service" | "accessToken" | "accountId" | "metadata" | "apiKey" | "secretKey">;

/** Authorize uses saved customer profiles rather than Stripe/Square access tokens. */
async function resolveAuthorizePaymentMethod(
    gateway: AuthorizeGateway,
    gatewayCustomerId: string,
    selectedMethodId: string | null,
): Promise<SubscriptionBillingContext> {
    if (!gateway.apiKey || !gateway.secretKey || !selectedMethodId) {
        throw new BillingContextError("Authorize.net payment setup is missing", "PAYMENT_METHOD_MISSING");
    }
    const profile = await new AuthorizePaymentGateway(gateway.apiKey, gateway.secretKey).getCustomerProfile(gatewayCustomerId);
    const profiles = Array.isArray(profile.paymentProfiles) ? profile.paymentProfiles : profile.paymentProfiles ? [profile.paymentProfiles] : [];
    if (!profiles.some(method => method.customerPaymentProfileId === selectedMethodId)) {
        throw new BillingContextError("Payment method does not belong to subscription customer", "PAYMENT_METHOD_OWNER_MISMATCH");
    }
    return { gateway: { ...gateway, integrationId: gateway.id, accessToken: gateway.accessToken ?? "" },
        gatewayCustomerId, paymentMethodId: selectedMethodId, paymentMethodType: "card" };
}

// The cutover script stops the old collector and checks invoice overlap before arming.
// Runtime keeps only local readiness, account, and cutoff checks.
export async function assertImportedSubscriptionRetrySafe(
    subscription: SubscriptionLike,
    gateway: SubscriptionBillingContext["gateway"],
    periodStart: Date | null,
) {
    const migration = getStripeMigration(subscription.metadata);
    if (!migration || migration.state === "first_payment_verified") return;
    if (migration.state !== "armed") {
        throw new BillingContextError(`Imported subscription is not armed: ${migration.state}`, "MIGRATION_BLOCKED");
    }
    if (gateway.service !== "stripe" || !gateway.accessToken) {
        throw new BillingContextError("Imported subscription requires a Stripe gateway", "MIGRATION_BLOCKED");
    }
    if (gateway.accountId !== migration.connectedAccountId) {
        throw new BillingContextError("Imported subscription gateway account does not match migration", "MIGRATION_BLOCKED");
    }
    if (!periodStart || periodStart.getTime() !== new Date(migration.cutoffAt).getTime()) {
        throw new BillingContextError("Imported subscription retry is outside the migration cutoff", "MIGRATION_BLOCKED");
    }
}


export class BillingContextError extends Error {
    constructor(message: string, readonly code: string) {
        super(message);
        this.name = "BillingContextError";
    }
}

export async function findInFlightSubscriptionAttempt(subscriptionId: string) {
    const invoice = await db.query.memberInvoices.findFirst({
        where: (row, { and: andFn, eq: equals }) => andFn(
            equals(row.memberPlanId, subscriptionId),
            equals(row.status, "unpaid"),
        ),
        columns: { id: true, metadata: true, status: true },
        orderBy: (row, { desc }) => desc(row.updated),
    });
    const attempt = invoice?.metadata && typeof invoice.metadata === "object"
        ? (invoice.metadata as Record<string, unknown>).billingAttempt
        : undefined;
    const attemptStatus = typeof attempt === "object" && attempt !== null
        ? (attempt as { status?: unknown }).status
        : undefined;
    return attemptStatus === "in_flight"
        || attemptStatus === "unknown"
        || attemptStatus === "processing"
        || attemptStatus === "requires_action"
        ? { invoice, status: attemptStatus }
        : null;
}

