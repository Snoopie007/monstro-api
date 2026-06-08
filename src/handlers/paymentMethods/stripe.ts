import { db } from "@/db/db";
import { StripePaymentGateway } from "@/libs/PaymentGateway";
import { memberLocations } from "@subtrees/schemas";
import type { PaymentMethod, PaymentType } from "@subtrees/types";
import { eq } from "drizzle-orm";


type StripeCardPaymentMethod = {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
};

type StripeUsBankAccountPaymentMethod = {
    bank_name: string | null;
    last4: string | null;
    account_type: string | null;
};

function mapStripePaymentMethod(method: {
    id?: string;
    type: string;
    card?: StripeCardPaymentMethod;
    us_bank_account?: StripeUsBankAccountPaymentMethod;
}): PaymentMethod | null {
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
}

export async function getStripePaymentMethods(mid: string, lid: string): Promise<PaymentMethod[]> {
    const ml = await db.query.memberLocations.findFirst({
        where: (memberLocation, { eq: equals, and: andFn }) => andFn(
            eq(memberLocation.memberId, mid),
            eq(memberLocation.locationId, lid),
        ),
        columns: {
            gatewayCustomerId: true,
        },
    });

    if (!ml || !ml.gatewayCustomerId) {
        return [];
    }

    const stripeIntegration = await db.query.integrations.findFirst({
        where: (integration, { eq: equals, and: andFn }) => andFn(
            eq(integration.locationId, lid),
            eq(integration.service, "stripe"),
        ),
        columns: {
            accountId: true,
            accessToken: true,
        },
    });

    if (!stripeIntegration?.accountId || !stripeIntegration.accessToken) {
        throw new Error("Stripe integration not found");
    }

    const stripe = new StripePaymentGateway(stripeIntegration.accessToken);
    const stripePaymentMethods = await stripe.getPaymentMethods(ml.gatewayCustomerId);

    return stripePaymentMethods
        .map(mapStripePaymentMethod)
        .filter((pm): pm is PaymentMethod => pm !== null);
}

export async function getStripeSetupIntent(input: {
    mid: string;
    lid: string;
    ephemeralKey?: boolean;
}) {
    const { mid, lid, ephemeralKey } = input;

    const locationState = await db.query.locationState.findFirst({
        where: (row, { eq: equals }) => equals(row.locationId, lid),
        columns: {
            paymentGatewayId: true,
        },
    });

    if (!locationState) {
        throw new Error("Location state not found");
    }

    const paymentGatewayId = locationState.paymentGatewayId;
    if (!paymentGatewayId) {
        throw new Error("Payment gateway not found");
    }

    const gateway = await db.query.integrations.findFirst({
        where: (i, { eq: equals }) => equals(i.id, paymentGatewayId),
        columns: { accountId: true, accessToken: true },
    });

    if (!gateway?.accountId || !gateway.accessToken) {
        throw new Error("Stripe integration not found");
    }

    const stripe = new StripePaymentGateway(gateway.accessToken);
    const ml = await db.query.memberLocations.findFirst({
        where: (memberLocation, { eq: equals, and: andFn }) => andFn(
            eq(memberLocation.memberId, mid),
            eq(memberLocation.locationId, lid),
        ),
        columns: {
            gatewayCustomerId: true,
        },
    });

    let stripeCustomerId = ml?.gatewayCustomerId ?? null;
    if (stripeCustomerId === null) {
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
        if (!member) {
            throw new Error("Member not found");
        }
        const customer = await stripe.createCustomer({
            email: member.email,
            phone: member.phone,
            firstName: member.firstName,
            lastName: member.lastName,
        }, undefined, {
            memberId: mid,
        });

        await db.insert(memberLocations).values({
            memberId: mid,
            locationId: lid,
            gatewayCustomerId: customer.id,
        }).onConflictDoUpdate({
            target: [memberLocations.memberId, memberLocations.locationId],
            set: {
                gatewayCustomerId: customer.id,
                updated: new Date(),
            },
        });

        stripeCustomerId = customer.id;
    }

    const setupIntent = await stripe.createSetupIntent(stripeCustomerId);

    let ek = undefined;
    if (ephemeralKey) {
        ek = await stripe.createEphemeralKey(stripeCustomerId, gateway.accountId);
    }

    return {
        customer: setupIntent.customer,
        clientSecret: setupIntent.client_secret,
        ephemeralKey: ek,
    };
}
