import { strict as assert } from "node:assert";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
    AuthorizeApiError,
    AuthorizePaymentGateway,
    authorizeMerchantCustomerId,
    type AuthorizeCustomerProfile,
} from "@/libs/PaymentGateway";
import { authorizeAuthenticationFromIntegration } from "@/libs/PaymentGateway/AuthorizeAuthentication";
import { integrations, locationState, memberLocations } from "@subtrees/schemas";
import type { Address, PaymentMethod } from "@subtrees/types";

async function getAuthorizeGateway(lid: string) {
    const state = await db.query.locationState.findFirst({
        where: eq(locationState.locationId, lid),
        columns: { paymentGatewayId: true },
    });
    if (!state?.paymentGatewayId) throw new Error("Authorize.net integration not found");

    const integration = await db.query.integrations.findFirst({
        where: and(
            eq(integrations.id, state.paymentGatewayId),
            eq(integrations.locationId, lid),
            eq(integrations.service, "authorize"),
        ),
        columns: {
            id: true,
            apiKey: true,
            secretKey: true,
            accessToken: true,
            refreshToken: true,
            expires: true,
            metadata: true,
        },
    });
    if (!integration) {
        throw new Error("Authorize.net integration not found");
    }
    const authentication = await authorizeAuthenticationFromIntegration(integration);
    return {
        integration,
        gateway: new AuthorizePaymentGateway(authentication),
    };
}

function assertProfileOwner(profile: AuthorizeCustomerProfile, memberId: string, email: string) {
    const ownsProfile = profile.merchantCustomerId
        ? profile.merchantCustomerId === authorizeMerchantCustomerId(memberId)
        : profile.email?.toLowerCase() === email.toLowerCase();
    if (!ownsProfile) throw new Error("Authorize.net customer profile does not belong to member");
}

function duplicateRecordId(error: unknown) {
    return error instanceof AuthorizeApiError && error.code === "E00039"
        ? error.message.match(/\bID (\d+)\b/i)?.[1]
        : undefined;
}

function mapPaymentMethods(profile: AuthorizeCustomerProfile): PaymentMethod[] {
    return (profile.paymentProfiles ?? []).map((paymentProfile) => {
        const id = paymentProfile.customerPaymentProfileId;
        const card = paymentProfile.payment?.creditCard;
        const last4 = card?.cardNumber?.match(/(\d{4})$/)?.[1];
        const expiration = card?.expirationDate?.match(/^(\d{4})-(\d{2})$/);
        assert(id, "Authorize.net payment profile ID is missing");
        assert(card?.cardType, "Authorize.net card brand is missing");
        assert(last4, "Authorize.net card number is missing");

        const billTo = paymentProfile.billTo;
        return {
            id,
            source: "authorize",
            type: "card",
            isDefault: paymentProfile.defaultPaymentProfile === true || id === profile.defaultPaymentProfile,
            card: {
                brand: card.cardType,
                last4,
                expMonth: expiration ? Number(expiration[2]) : null,
                expYear: expiration ? Number(expiration[1]) : null,
            },
            ...(billTo && {
                address: {
                    line1: billTo.address ?? "",
                    line2: "",
                    city: billTo.city ?? "",
                    state: billTo.state ?? "",
                    postalCode: billTo.zip ?? "",
                    country: billTo.country ?? "",
                },
            }),
        };
    });
}

export async function getAuthorizePaymentMethods(mid: string, lid: string): Promise<PaymentMethod[]> {
    const memberLocation = await db.query.memberLocations.findFirst({
        where: (row, { and, eq }) => and(eq(row.memberId, mid), eq(row.locationId, lid)),
        columns: { gatewayCustomerId: true },
        with: { member: { columns: { email: true } } },
    });
    if (!memberLocation?.gatewayCustomerId || !/^\d+$/.test(memberLocation.gatewayCustomerId)) return [];

    const { gateway } = await getAuthorizeGateway(lid);
    try {
        const profile = await gateway.getCustomerProfile(memberLocation.gatewayCustomerId);
        assertProfileOwner(profile, mid, memberLocation.member.email);
        return mapPaymentMethods(profile);
    } catch (error) {
        if (error instanceof AuthorizeApiError && error.code === "E00040") return [];
        throw error;
    }
}

export async function getAuthorizeClientConfig(lid: string) {
    const { integration } = await getAuthorizeGateway(lid);
    const publicClientKey = integration.metadata?.publicClientKey;
    const scriptUrl = process.env.AUTHORIZE_SCRIPT_URL;
    if (!integration.apiKey || typeof publicClientKey !== "string" || !publicClientKey || !scriptUrl) {
        throw new Error("Authorize.net client configuration not found");
    }
    return { apiLoginId: integration.apiKey, publicClientKey, scriptUrl };
}

export async function addAuthorizePaymentMethod(input: {
    mid: string;
    lid: string;
    opaqueData: { dataDescriptor: string; dataValue: string };
    name?: string;
    address?: Address;
}): Promise<PaymentMethod> {
    if (
        input.opaqueData.dataDescriptor !== "COMMON.ACCEPT.INAPP.PAYMENT" ||
        !input.opaqueData.dataValue ||
        input.opaqueData.dataValue.length > 2048
    ) {
        throw new Error("Invalid Authorize.net payment data");
    }

    const [{ gateway }, memberLocation] = await Promise.all([
        getAuthorizeGateway(input.lid),
        db.query.memberLocations.findFirst({
            where: (row, { and, eq }) => and(eq(row.memberId, input.mid), eq(row.locationId, input.lid)),
            columns: { gatewayCustomerId: true },
            with: {
                member: {
                    columns: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        }),
    ]);
    assert(memberLocation, "Member location not found");
    const member = memberLocation.member;
    const name = input.name?.trim() || `${member.firstName} ${member.lastName ?? ""}`.trim();

    let customerProfileId = memberLocation.gatewayCustomerId;
    if (customerProfileId && /^\d+$/.test(customerProfileId)) {
        try {
            const profile = await gateway.getCustomerProfile(customerProfileId);
            assertProfileOwner(profile, member.id, member.email);
        } catch (error) {
            if (!(error instanceof AuthorizeApiError) || error.code !== "E00040") throw error;
            customerProfileId = null;
        }
    } else {
        customerProfileId = null;
    }

    if (!customerProfileId) {
        try {
            customerProfileId = await gateway.createCustomerProfile({
                memberId: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
            });
        } catch (error) {
            const recoveredCustomerProfileId = duplicateRecordId(error);
            if (!recoveredCustomerProfileId) throw error;
            customerProfileId = recoveredCustomerProfileId;
            const profile = await gateway.getCustomerProfile(customerProfileId);
            assertProfileOwner(profile, member.id, member.email);
        }
        await db.update(memberLocations)
            .set({ gatewayCustomerId: customerProfileId, updated: new Date() })
            .where(and(
                eq(memberLocations.memberId, input.mid),
                eq(memberLocations.locationId, input.lid),
            ));
    }

    let paymentProfileId: string;
    try {
        paymentProfileId = await gateway.createPaymentProfile({
            customerProfileId,
            dataDescriptor: input.opaqueData.dataDescriptor,
            dataValue: input.opaqueData.dataValue,
            name,
            address: input.address,
        });
    } catch (error) {
        const recoveredPaymentProfileId = duplicateRecordId(error);
        if (!recoveredPaymentProfileId) throw error;
        paymentProfileId = recoveredPaymentProfileId;
    }
    const profile = await gateway.getCustomerProfile(customerProfileId);
    assertProfileOwner(profile, member.id, member.email);
    const paymentMethod = mapPaymentMethods(profile).find((method) => method.id === paymentProfileId);
    if (!paymentMethod) throw new Error("Authorize.net did not return the saved card");
    return paymentMethod;
}
