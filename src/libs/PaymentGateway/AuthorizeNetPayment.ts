import { createHash } from "node:crypto";

export type AuthorizeNetCustomerProfile = {
    customerProfileId?: string;
    merchantCustomerId?: string;
    email?: string;
    defaultPaymentProfile?: string;
    paymentProfiles?: unknown[];
};

export class AuthorizeNetApiError extends Error {
    constructor(readonly code: string, message: string) {
        super(message);
        this.name = "AuthorizeNetApiError";
    }
}

export function authorizeNetMerchantCustomerId(memberId: string) {
    return `m_${createHash("sha256").update(memberId).digest("hex").slice(0, 18)}`;
}

export class AuthorizeNetPaymentGateway {
    constructor(
        private readonly apiLoginId: string,
        private readonly transactionKey: string,
    ) {}

    private async request(operation: string, payload: Record<string, unknown>) {
        const url = process.env.AUTHORIZE_NET_API_URL;
        if (!url) throw new Error("AUTHORIZE_NET_API_URL is missing");

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [operation]: {
                        merchantAuthentication: { name: this.apiLoginId, transactionKey: this.transactionKey },
                        ...payload,
                    },
                }),
                signal: AbortSignal.timeout(10_000),
            });
        } catch (cause) {
            throw new Error("Authorize.net request could not be completed", { cause });
        }

        if (!response.ok) throw new Error(`Authorize.net request failed with status ${response.status}`);

        const raw = await response.text();
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
        } catch {
            throw new Error("Authorize.net returned invalid JSON");
        }

        const messages = parsed.messages as Record<string, unknown> | undefined;
        const first = Array.isArray(messages?.message)
            ? messages.message[0] as Record<string, unknown> | undefined
            : undefined;
        const hasTransactionResponse = parsed.transactionResponse !== null &&
            typeof parsed.transactionResponse === "object" &&
            !Array.isArray(parsed.transactionResponse);
        if (messages?.resultCode !== "Ok" && !hasTransactionResponse) {
            throw new AuthorizeNetApiError(
                typeof first?.code === "string" ? first.code : "AUTHORIZE_NET_ERROR",
                typeof first?.text === "string" ? first.text : "Authorize.net request failed",
            );
        }
        return parsed;
    }

    async getCustomerProfile(customerProfileId: string) {
        const response = await this.request("getCustomerProfileRequest", {
            customerProfileId,
            unmaskExpirationDate: true,
        });
        return (response.profile ?? response.customerProfile ?? {}) as AuthorizeNetCustomerProfile;
    }

    async createCustomerProfile(input: {
        memberId: string;
        firstName: string;
        lastName: string | null;
        email: string;
    }) {
        const response = await this.request("createCustomerProfileRequest", {
            profile: {
                merchantCustomerId: authorizeNetMerchantCustomerId(input.memberId),
                description: `${input.firstName} ${input.lastName ?? ""}`.trim() || input.memberId,
                email: input.email,
            },
        });
        const profile = (response.profile ?? response.customerProfile ?? {}) as AuthorizeNetCustomerProfile;
        const id = profile.customerProfileId ?? (response.customerProfileId as string | undefined);
        if (!id) throw new Error("Authorize.net did not return a customer profile ID");
        return id;
    }

    async createPaymentProfile(input: {
        customerProfileId: string;
        dataDescriptor: string;
        dataValue: string;
        name: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            postalCode?: string;
            country?: string;
        };
    }) {
        const names = input.name.trim().split(/\s+/);
        const response = await this.request("createCustomerPaymentProfileRequest", {
            customerProfileId: input.customerProfileId,
            paymentProfile: {
                billTo: {
                    firstName: names[0],
                    lastName: names.slice(1).join(" ") || undefined,
                    address: [input.address?.line1, input.address?.line2].filter(Boolean).join(", ") || undefined,
                    city: input.address?.city,
                    state: input.address?.state,
                    zip: input.address?.postalCode,
                    country: input.address?.country ?? "US",
                },
                payment: {
                    opaqueData: {
                        dataDescriptor: input.dataDescriptor,
                        dataValue: input.dataValue,
                    },
                },
            },
            validationMode: process.env.AUTHORIZE_NET_API_URL?.includes("apitest.authorize.net")
                ? "testMode"
                : "liveMode",
        });
        const id = response.customerPaymentProfileId;
        if (typeof id !== "string") throw new Error("Authorize.net did not return a payment profile ID");
        return id;
    }

    async createCharge(
        customerProfileId: string,
        paymentProfileId: string,
        options: {
            total: number;
            currency: string;
            authorizeOnly?: boolean;
            idempotencyKey?: string;
        },
    ) {
        if (!Number.isInteger(options.total) || options.total < 1) {
            throw new Error("Charge total must be a positive integer in cents");
        }

        const response = await this.request("createTransactionRequest", {
            refId: options.idempotencyKey
                ? createHash("sha256").update(options.idempotencyKey).digest("hex").slice(0, 20)
                : undefined,
            transactionRequest: {
                transactionType: options.authorizeOnly ? "authOnlyTransaction" : "authCaptureTransaction",
                amount: (options.total / 100).toFixed(2),
                currencyCode: options.currency,
                profile: {
                    customerProfileId,
                    paymentProfile: { paymentProfileId },
                },
                processingOptions: { isStoredCredentials: true },
            },
        });
        const transaction = response.transactionResponse as Record<string, unknown> | undefined;
        const responseCode = String(transaction?.responseCode ?? "");
        if (responseCode !== "1") {
            const errors = transaction?.errors as Record<string, unknown> | undefined;
            const first = Array.isArray(errors?.error)
                ? errors.error[0] as Record<string, unknown> | undefined
                : undefined;
            throw new AuthorizeNetApiError(
                typeof first?.errorCode === "string" ? first.errorCode : responseCode || "AUTHORIZE_NET_DECLINED",
                typeof first?.errorText === "string" ? first.errorText : "Authorize.net declined the transaction",
            );
        }
        return transaction;
    }
}
