import { db } from "@/db/db";
import { StripePaymentGateway } from "@/libs/PaymentGateway";
import { memberLocations } from "@subtrees/schemas";
import type { PaymentMethod, PaymentType } from "@subtrees/types";
import { eq } from "drizzle-orm";

export async function getStripePaymentMethods(mid: string, lid: string): Promise<PaymentMethod[]> {
    const [ml, locationState] = await Promise.all([
        db.query.memberLocations.findFirst({
            where: (memberLocation, { eq: equals, and: andFn }) => andFn(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, lid),
            ),
            columns: { gatewayCustomerId: true },
        }),
        db.query.locationState.findFirst({
            where: (row, { eq: equals }) => equals(row.locationId, lid),
            columns: { paymentGatewayId: true },
        }),
    ]);
    const subscriptions = await db.query.memberSubscriptions.findMany({
        where: (subscription, { eq: equals }) => equals(subscription.locationId, lid),
        columns: { id: true, parentId: true, memberId: true, metadata: true },
    });
    const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription] as const));
    const collectingRoots = new Map<typeof subscriptions[number]["id"], typeof subscriptions[number]>();

    for (const subscription of subscriptions) {
        if (subscription.memberId !== mid) continue;
        const visited = new Set<string>();
        let current: (typeof subscriptions)[number] | undefined = subscription;
        while (current?.parentId) {
            if (visited.has(current.id)) {
                current = undefined;
                break;
            }
            visited.add(current.id);
            current = subscriptionsById.get(current.parentId);
        }
        if (current) collectingRoots.set(current.id, current);
    }

    const importedBindings = [...collectingRoots.values()]
        .map((subscription) => {
            const metadata = subscription.metadata ?? {};
            const customerId = typeof metadata.gatewayCustomerId === "string" ? metadata.gatewayCustomerId : null;
            const integrationId = typeof metadata.gatewayIntegrationId === "string" ? metadata.gatewayIntegrationId : null;
            return customerId || integrationId ? { customerId, integrationId } : null;
        })
        .filter((binding): binding is { customerId: string | null; integrationId: string | null } => binding !== null);
    const bindings = [
        ...(ml?.gatewayCustomerId ? [{
            customerId: ml.gatewayCustomerId,
            integrationId: locationState?.paymentGatewayId ?? null,
        }] : []),
        ...importedBindings,
    ];
    const distinctBindings = new Map(
        bindings.map((binding) => [`${binding.integrationId ?? ""}:${binding.customerId ?? ""}`, binding] as const),
    );
    if (distinctBindings.size > 1) {
        throw new Error("Multiple Stripe billing customers require support");
    }
    const distinctBinding = distinctBindings.values().next().value;
    const binding = {
        customerId: distinctBinding?.customerId ?? null,
        integrationId: distinctBinding?.integrationId ?? null,
        hasImportedBinding: importedBindings.length > 0,
    };
    const stripeIntegration = binding.integrationId
        ? await db.query.integrations.findFirst({
            where: (integration, { eq: equals, and: andFn }) => andFn(
                eq(integration.id, binding.integrationId!),
                eq(integration.locationId, lid),
                eq(integration.service, "stripe"),
            ),
            columns: { accountId: true, accessToken: true },
        })
        : await db.query.integrations.findFirst({
            where: (integration, { eq: equals, and: andFn }) => andFn(
                eq(integration.locationId, lid),
                eq(integration.service, "stripe"),
            ),
            columns: { accountId: true, accessToken: true },
        });
    if (!stripeIntegration?.accountId || !stripeIntegration.accessToken) {
        throw new Error("Stripe integration not found");
    }
    if (!binding.customerId) return [];
    const stripe = new StripePaymentGateway(stripeIntegration.accessToken);
    const stripePaymentMethods = await stripe.getPaymentMethods(binding.customerId);
    return stripePaymentMethods
        .map((method) => {
            if (!method.id) return null;

            if (method.type === "card" && method.card) {
                const card = method.card;
                return {
                    id: method.id,
                    source: "stripe",
                    type: method.type as PaymentType,
                    isDefault: false,
                    card: {
                        brand: card.brand,
                        last4: card.last4,
                        expMonth: card.exp_month,
                        expYear: card.exp_year,
                    },
                    usBankAccount: undefined,
                };
            }

            if (method.type === "us_bank_account" && method.us_bank_account) {
                const bank = method.us_bank_account;
                return {
                    id: method.id,
                    source: "stripe",
                    type: method.type as PaymentType,
                    isDefault: false,
                    usBankAccount: {
                        bankName: bank.bank_name,
                        last4: bank.last4,
                        accountType: bank.account_type,
                    },
                    card: undefined,
                };
            }

            return null;
        })
        .filter((pm): pm is PaymentMethod => pm !== null);
}

export async function getStripeSetupIntent(input: {
    mid: string;
    lid: string;
    ephemeralKey?: boolean;
}) {
    const { mid, lid, ephemeralKey } = input;

    const [locationState, ml] = await Promise.all([
        db.query.locationState.findFirst({
            where: (row, { eq: equals }) => equals(row.locationId, lid),
            columns: { paymentGatewayId: true },
        }),
        db.query.memberLocations.findFirst({
            where: (memberLocation, { eq: equals, and: andFn }) => andFn(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, lid),
            ),
            columns: { gatewayCustomerId: true },
        }),
    ]);
    if (!locationState) throw new Error("Location state not found");

    const subscriptions = await db.query.memberSubscriptions.findMany({
        where: (subscription, { eq: equals }) => equals(subscription.locationId, lid),
        columns: { id: true, parentId: true, memberId: true, metadata: true },
    });
    const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription] as const));
    const collectingRoots = new Map<typeof subscriptions[number]["id"], typeof subscriptions[number]>();

    for (const subscription of subscriptions) {
        if (subscription.memberId !== mid) continue;
        const visited = new Set<string>();
        let current: (typeof subscriptions)[number] | undefined = subscription;
        while (current?.parentId) {
            if (visited.has(current.id)) {
                current = undefined;
                break;
            }
            visited.add(current.id);
            current = subscriptionsById.get(current.parentId);
        }
        if (current) collectingRoots.set(current.id, current);
    }

    const importedBindings = [...collectingRoots.values()]
        .map((subscription) => {
            const metadata = subscription.metadata ?? {};
            const customerId = typeof metadata.gatewayCustomerId === "string" ? metadata.gatewayCustomerId : null;
            const integrationId = typeof metadata.gatewayIntegrationId === "string" ? metadata.gatewayIntegrationId : null;
            return customerId || integrationId ? { customerId, integrationId } : null;
        })
        .filter((binding): binding is { customerId: string | null; integrationId: string | null } => binding !== null);
    const bindings = [
        ...(ml?.gatewayCustomerId ? [{
            customerId: ml.gatewayCustomerId,
            integrationId: locationState.paymentGatewayId ?? null,
        }] : []),
        ...importedBindings,
    ];
    const distinctBindings = new Map(
        bindings.map((binding) => [`${binding.integrationId ?? ""}:${binding.customerId ?? ""}`, binding] as const),
    );
    if (distinctBindings.size > 1) {
        throw new Error("Multiple Stripe billing customers require support");
    }
    const distinctBinding = distinctBindings.values().next().value;
    const binding = {
        customerId: distinctBinding?.customerId ?? null,
        integrationId: distinctBinding?.integrationId ?? null,
        hasImportedBinding: importedBindings.length > 0,
    };
    if (!binding.customerId && binding.hasImportedBinding) {
        throw new Error("Imported billing customer is missing; support is required");
    }
    const paymentGatewayId = binding.integrationId ?? locationState.paymentGatewayId;
    if (!paymentGatewayId) throw new Error("Payment gateway not found");
    const gateway = await db.query.integrations.findFirst({
        where: (i, { eq: equals, and: andFn }) => andFn(
            eq(i.id, paymentGatewayId),
            eq(i.locationId, lid),
            eq(i.service, "stripe"),
        ),
        columns: { accountId: true, accessToken: true },
    });
    if (!gateway?.accountId || !gateway.accessToken) throw new Error("Stripe integration not found");
    const stripe = new StripePaymentGateway(gateway.accessToken);

    let stripeCustomerId = binding.customerId;

    if (!stripeCustomerId) {
        const member = await db.query.members.findFirst({
            where: (row, { eq }) => eq(row.id, mid),
            columns: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
            },
        });
        if (!member) throw new Error("Member not found");
        const customer = await stripe.createCustomer({
            email: member.email,
            phone: member.phone,
            firstName: member.firstName,
            lastName: member.lastName,
        }, undefined, { memberId: mid });
        await db.insert(memberLocations).values({
            memberId: mid,
            locationId: lid,
            gatewayCustomerId: customer.id,
        }).onConflictDoUpdate({
            target: [memberLocations.memberId, memberLocations.locationId],
            set: { gatewayCustomerId: customer.id, updated: new Date() },
        });
        stripeCustomerId = customer.id;
    }

    const setupIntent = await stripe.createSetupIntent(stripeCustomerId);
    const ek = ephemeralKey
        ? await stripe.createEphemeralKey(stripeCustomerId, gateway.accountId)
        : undefined;
    return {
        customer: setupIntent.customer,
        clientSecret: setupIntent.client_secret,
        ephemeralKey: ek,
    };
}
