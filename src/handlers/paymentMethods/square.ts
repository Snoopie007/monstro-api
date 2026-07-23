import { db } from "@/db/db";
import { SquarePaymentGateway } from "@/libs/PaymentGateway/SquarePayment";
import { memberLocations } from "@subtrees/schemas";
import type { PaymentMethod } from "@subtrees/types";
import { eq } from "drizzle-orm";
import { getSquareErrorMessage } from "./errors";


interface SquareCardPaymentMethod {
    id?: string;
    cardBrand?: string;
    last4?: string;
    expMonth?: number | bigint | null;
    expYear?: number | bigint | null;
}

function mapSquareCard(pm: SquareCardPaymentMethod | undefined): PaymentMethod | null {
    if (!pm?.id) return null;

    return {
        id: pm.id,
        source: "square",
        type: "card",
        isDefault: false,
        card: {
            brand: pm.cardBrand ? pm.cardBrand.toLowerCase() : "unknown",
            last4: pm.last4!,
            expMonth: Number(pm.expMonth),
            expYear: Number(pm.expYear),
        },
        usBankAccount: undefined,
    };
}

export async function getSquarePaymentMethods(mid: string, lid: string): Promise<PaymentMethod[]> {
    const ml = await db.query.memberLocations.findFirst({
        where: (memberLocation, { eq, and }) => and(
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

    const squareGateway = await db.query.integrations.findFirst({
        where: (i, { eq, and }) => and(
            eq(i.locationId, lid),
            eq(i.service, "square"),
        ),
        columns: {
            accountId: true,
            accessToken: true,
            metadata: true,
            expires: true,
        },
    });

    if (squareGateway?.expires && squareGateway.expires < Date.now()) {
        console.error("Square integration expired");
    }

    if (!squareGateway?.accountId || !squareGateway.accessToken) {
        throw new Error("Square integration not found");
    }

    const square = new SquarePaymentGateway(squareGateway.accessToken);
    const pms = await square.getCards(ml.gatewayCustomerId);

    return pms
        .map(mapSquareCard)
        .filter((pm): pm is PaymentMethod => pm !== null);
}

export async function addSquarePaymentMethod(input: {
    mid: string;
    lid: string;
    nonce: string;
}): Promise<PaymentMethod> {
    const { mid, lid, nonce } = input;

    const squareGateway = await db.query.integrations.findFirst({
        where: (i, { eq, and }) => and(
            eq(i.locationId, lid),
            eq(i.service, "square"),
        ),
        columns: {
            accountId: true,
            accessToken: true,
        },
    });

    if (!squareGateway?.accountId || !squareGateway.accessToken) {
        throw new Error("Square integration not found");
    }

    const ml = await db.query.memberLocations.findFirst({
        where: (row, { eq, and }) => and(
            eq(row.memberId, mid),
            eq(row.locationId, lid),
        ),
        columns: {
            gatewayCustomerId: true,
        },
    });


    const square = new SquarePaymentGateway(squareGateway.accessToken);
    const member = await db.query.members.findFirst({
        where: (row, { eq }) => eq(row.id, mid),
        columns: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
        },
    });
    if (!member) {
        throw new Error("Member not found");
    }
    let customerId = ml?.gatewayCustomerId ?? undefined;
    if (!customerId) {
        try {

            const customer = await square.createCustomer({ ...member });

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
            customerId = customer.id;
        } catch (err) {
            console.log(err);
            throw new Error("Failed to create customer");
        }
    }

    if (!customerId) {
        throw new Error("Customer ID not found");
    }

    const cardholderName = `${member.firstName} ${member.lastName ?? ""}`.trim();
    const card = await square.createCard(customerId, nonce, {
        cardholderName,
        referenceId: mid,
    });

    if (!card?.id) {
        throw new Error("Failed to create card");
    }

    const pm = mapSquareCard(card);
    if (!pm) {
        throw new Error("Failed to create card");
    }

    return pm;
}
