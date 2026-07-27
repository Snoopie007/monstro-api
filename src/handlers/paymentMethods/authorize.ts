import { db } from "@/db/db";
import {
    AuthorizeNetPaymentGateway,
    authorizeNetMerchantCustomerId,
    type AuthorizeNetCustomerProfile,
} from "@/libs/PaymentGateway";
import { memberLocations } from "@subtrees/schemas";
import type { Address, PaymentMethod } from "@subtrees/types";

async function getAuthorizeGateway(lid: string) {
    const integration = await db.query.integrations.findFirst({
        where: (row, { and, eq }) => and(eq(row.locationId, lid), eq(row.service, "authorize")),
        columns: { apiKey: true, secretKey: true, metadata: true },
    });
    if (!integration?.apiKey || !integration.secretKey) {
        throw new Error("Authorize.net integration not found");
    }
    return {
        integration,
        gateway: new AuthorizeNetPaymentGateway(integration.apiKey, integration.secretKey),
    };
}

function assertProfileOwner(profile: AuthorizeNetCustomerProfile, memberId: string, email: string) {
    const ownsProfile = profile.merchantCustomerId
        ? profile.merchantCustomerId === authorizeNetMerchantCustomerId(memberId)
        : profile.email?.toLowerCase() === email.toLowerCase();
    if (!ownsProfile) throw new Error("Authorize.net customer profile does not belong to member");
}

function mapPaymentMethods(profile: AuthorizeNetCustomerProfile): PaymentMethod[] {
    return (profile.paymentProfiles ?? []).flatMap((paymentProfile) => {
        const value = paymentProfile as Record<string, unknown>;
        const id = value.customerPaymentProfileId;
        if (typeof id !== "string") return [];

        const payment = value.payment as Record<string, unknown> | undefined;
        const card = payment?.creditCard as Record<string, unknown> | undefined;
        const billTo = value.billTo as Record<string, unknown> | undefined;
        const expiration = typeof card?.expirationDate === "string" ? /^(\d{4})-(\d{2})$/.exec(card.expirationDate) : null;
        const cardNumber = typeof card?.cardNumber === "string" ? card.cardNumber : "";
        const hasAddress = [billTo?.address, billTo?.city, billTo?.state, billTo?.zip, billTo?.country].some(Boolean);

        return [{
            id,
            source: "authorize-net",
            type: "card",
            isDefault: id === profile.defaultPaymentProfile,
            card: {
                brand: typeof card?.cardType === "string" ? card.cardType : "Card",
                last4: cardNumber.match(/(\d{4})$/)?.[1] ?? null,
                expMonth: expiration ? Number(expiration[2]) : null,
                expYear: expiration ? Number(expiration[1]) : null,
            },
            ...(hasAddress && {
                address: {
                    line1: typeof billTo?.address === "string" ? billTo.address : "",
                    line2: "",
                    city: typeof billTo?.city === "string" ? billTo.city : "",
                    state: typeof billTo?.state === "string" ? billTo.state : "",
                    postalCode: typeof billTo?.zip === "string" ? billTo.zip : "",
                    country: typeof billTo?.country === "string" ? billTo.country : "",
                },
            }),
        }];
    });
}

export async function getAuthorizePaymentMethods(mid: string, lid: string): Promise<PaymentMethod[]> {
    const memberLocation = await db.query.memberLocations.findFirst({
        where: (row, { and, eq }) => and(eq(row.memberId, mid), eq(row.locationId, lid)),
        columns: { gatewayCustomerId: true },
    });
    if (!memberLocation?.gatewayCustomerId || !/^\d+$/.test(memberLocation.gatewayCustomerId)) return [];

    const member = await db.query.members.findFirst({
        where: (row, { eq }) => eq(row.id, mid),
        columns: { email: true },
    });
    if (!member) throw new Error("Member not found");

    const { gateway } = await getAuthorizeGateway(lid);
    const profile = await gateway.getCustomerProfile(memberLocation.gatewayCustomerId);
    assertProfileOwner(profile, mid, member.email);
    return mapPaymentMethods(profile);
}

export async function getAuthorizeClientConfig(lid: string) {
    const { integration } = await getAuthorizeGateway(lid);
    const publicClientKey = integration.metadata?.publicClientKey;
    const scriptUrl = process.env.AUTHORIZE_NET_SCRIPT_URL;
    if (typeof publicClientKey !== "string" || !publicClientKey || !scriptUrl) {
        throw new Error("Authorize.net client configuration not found");
    }
    return { apiLoginId: integration.apiKey, publicClientKey, scriptUrl };
}


type AddAuthorizePaymentMethodParams = {
    mid: string;
    lid: string;
    opaqueData: { dataDescriptor: string; dataValue: string };
    name: string;
    address?: Address;
}

export async function addAuthorizePaymentMethod(params: AddAuthorizePaymentMethodParams): Promise<PaymentMethod> {
    const { mid, lid, opaqueData, name, address } = params;
    if (opaqueData.dataDescriptor !== "COMMON.ACCEPT.INAPP.PAYMENT" ||
        !opaqueData.dataValue || opaqueData.dataValue.length > 2048 ||
        !name.trim()
    ) {
        throw new Error("Invalid Authorize.net payment data");
    }

    const [{ gateway }, memberLocation] = await Promise.all([
        getAuthorizeGateway(lid),
        db.query.memberLocations.findFirst({
            where: (ml, { and, eq }) => and(eq(ml.memberId, mid), eq(ml.locationId, lid)),
            columns: { gatewayCustomerId: true },
            with: {
                member: {
                    columns: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        }),
    ]);

    if (!memberLocation) throw new Error("Member location not found");
    const { member, gatewayCustomerId } = memberLocation;


    let customerProfileId = gatewayCustomerId;
    if (customerProfileId && /^\d+$/.test(customerProfileId)) {
        const profile = await gateway.getCustomerProfile(customerProfileId);
        assertProfileOwner(profile, member.id, member.email);
    } else {
        customerProfileId = await gateway.createCustomerProfile({
            memberId: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
        });
        await db.insert(memberLocations).values({
            memberId: mid,
            locationId: lid,
            gatewayCustomerId: customerProfileId,
        }).onConflictDoUpdate({
            target: [memberLocations.memberId, memberLocations.locationId],
            set: { gatewayCustomerId: customerProfileId, updated: new Date() },
        });
    }

    const paymentProfileId = await gateway.createPaymentProfile({
        customerProfileId,
        dataDescriptor: opaqueData.dataDescriptor,
        dataValue: opaqueData.dataValue,
        name: name,
        address: address,
    });
    const profile = await gateway.getCustomerProfile(customerProfileId);
    assertProfileOwner(profile, member.id, member.email);
    const paymentMethod = mapPaymentMethods(profile).find((method) => method.id === paymentProfileId);
    if (!paymentMethod) throw new Error("Authorize.net did not return the saved card");
    return paymentMethod;
}
