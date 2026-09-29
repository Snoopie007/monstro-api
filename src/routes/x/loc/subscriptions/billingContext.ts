import { db } from "@/db/db";
import { StripePaymentGateway, SquarePaymentGateway } from "@/libs/PaymentGateway";
import { getStripeMigration } from "@subtrees/utils/subscriptionBilling";

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

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
    const value = metadata?.[key];
    return typeof value === "string" && value.length > 0 ? value : null;
}

export function isCollectingSubscription(subscription: Pick<SubscriptionLike, "parentId">) {
    return !subscription.parentId;
}

export function subscriptionGatewayCustomerId(subscription: SubscriptionLike, fallback: string | null | undefined) {
    return metadataString(subscription.metadata, "gatewayCustomerId") ?? fallback ?? null;
}

export async function resolveSubscriptionBillingContext(
    subscription: SubscriptionLike,
    options: { paymentMethodId?: string; requirePaymentMethod?: boolean } = {},
): Promise<SubscriptionBillingContext> {
    if (!isCollectingSubscription(subscription)) {
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
    const gatewayId = metadataString(metadata, "gatewayIntegrationId") ?? state?.paymentGatewayId;
    const gateway = gatewayId
        ? await db.query.integrations.findFirst({
            where: (row, { eq: equals }) => equals(row.id, gatewayId),
            columns: {
                id: true,
                locationId: true,
                service: true,
                accessToken: true,
                accountId: true,
                metadata: true,
            },
        })
        : await db.query.integrations.findFirst({
            where: (row, { eq: equals, and: andFn }) => andFn(
                equals(row.locationId, subscription.locationId!),
                equals(row.service, metadataString(metadata, "gatewayService") ?? "stripe"),
            ),
            columns: {
                id: true,
                locationId: true,
                service: true,
                accessToken: true,
                accountId: true,
                metadata: true,
            },
        });

    if (!gateway || gateway.locationId !== subscription.locationId) {
        throw new BillingContextError("Payment gateway integration not found", "GATEWAY_NOT_FOUND");
    }
    if (!gateway.accessToken || !gateway.accountId) {
        throw new BillingContextError("Payment gateway integration is not configured", "GATEWAY_NOT_CONFIGURED");
    }

    const gatewayCustomerId = subscriptionGatewayCustomerId(subscription, memberLocation?.gatewayCustomerId);
    if (!gatewayCustomerId) {
        throw new BillingContextError("Subscription billing customer is missing", "CUSTOMER_MISSING");
    }

    const selectedMethodId = options.paymentMethodId
        ?? subscription.gatewayPaymentId
        ?? metadataString(metadata, "paymentMethodId");
    if (gateway.service === "stripe") {
        if (!selectedMethodId && options.requirePaymentMethod !== false) {
            throw new BillingContextError("Subscription payment method is missing", "PAYMENT_METHOD_MISSING");
        }
        let paymentMethodId = selectedMethodId;
        let paymentMethodType: SupportedStripePaymentMethod | null = null;
        const stripe = new StripePaymentGateway(gateway.accessToken);
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
                accessToken: gateway.accessToken,
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
            await new SquarePaymentGateway(gateway.accessToken).retrieveCardForCustomer(gatewayCustomerId, selectedMethodId);
        } catch {
            throw new BillingContextError("Payment method does not belong to subscription customer", "PAYMENT_METHOD_OWNER_MISMATCH");
        }
        return {
            gateway: {
                ...gateway,
                integrationId: gateway.id,
                accessToken: gateway.accessToken,
            },
            gatewayCustomerId,
            paymentMethodId: selectedMethodId,
            paymentMethodType: "card",
        };
    }

    throw new BillingContextError("Unsupported payment gateway for subscriptions", "GATEWAY_UNSUPPORTED");
}
const LEGACY_COLLECTING_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const LEGACY_TERMINAL_INVOICES = new Set(["void", "uncollectible"]);

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
    const stripe = new StripePaymentGateway(gateway.accessToken);
    const legacy = await stripe.getSubscription(migration.sourceSubscriptionId);
    if (LEGACY_COLLECTING_STATUSES.has(legacy.status)) {
        throw new BillingContextError("Legacy Stripe subscription is still collecting", "MIGRATION_BLOCKED");
    }
    const legacyEndSeconds = legacy.items.data[0]?.current_period_end;
    const legacyEnd = legacyEndSeconds ? new Date(legacyEndSeconds * 1000) : null;
    if (!legacyEnd || legacyEnd.getTime() > periodStart.getTime()) {
        throw new BillingContextError("Legacy Stripe subscription overlaps imported retry", "MIGRATION_BLOCKED");
    }
    const customerId = typeof legacy.customer === "string" ? legacy.customer : legacy.customer?.id;
    if (!customerId) {
        throw new BillingContextError("Legacy Stripe subscription has no customer", "MIGRATION_BLOCKED");
    }
    const invoices = await stripe.listSubscriptionInvoices(customerId, migration.sourceSubscriptionId);
    const overlaps = invoices.some((invoice) => {
        if (LEGACY_TERMINAL_INVOICES.has(invoice.status || "")) return false;
        const start = invoice.period_start ? new Date(invoice.period_start * 1000).getTime() : 0;
        const end = invoice.period_end ? new Date(invoice.period_end * 1000).getTime() : Number.POSITIVE_INFINITY;
        return start <= periodStart.getTime() && end > periodStart.getTime();
    });
    if (overlaps) {
        throw new BillingContextError("Legacy Stripe invoice overlaps imported retry", "MIGRATION_BLOCKED");
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

