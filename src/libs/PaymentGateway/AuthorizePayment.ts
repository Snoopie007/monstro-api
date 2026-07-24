import { createHash } from "node:crypto";

export type AuthorizePaymentProfile = {
    customerPaymentProfileId?: string;
    billTo?: {
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    };
    payment?: {
        creditCard?: {
            cardType?: string;
            cardNumber?: string;
            expirationDate?: string;
        };
    };
    defaultPaymentProfile?: boolean;
};

export type AuthorizeCustomerProfile = {
    customerProfileId?: string;
    merchantCustomerId?: string;
    email?: string;
    defaultPaymentProfile?: string;
    paymentProfiles?: AuthorizePaymentProfile[];
};

export type AuthorizeTransactionDetails = {
    transId?: string;
    refTransId?: string;
    refId?: string;
    transactionType?: string;
    transactionStatus?: string;
    responseCode?: number | string;
    responseReasonCode?: number | string;
    responseReasonDescription?: string;
    amount?: number | string;
    authAmount?: number | string;
    currencyCode?: string;
    settleAmount?: number | string;
    avsResultCode?: string;
    cavvResultCode?: string;
    order?: { description?: string };
    errors?: { error?: Array<{ errorCode?: string; errorText?: string }> };
    messages?: { message?: Array<{ description?: string }> };
    profile?: {
        customerProfileId?: string;
        customerPaymentProfileId?: string;
    };
};

export class AuthorizeApiError extends Error {
    constructor(readonly code: string, message: string) {
        super(message);
        this.name = "AuthorizeApiError";
    }
}
export class AuthorizeTransportError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "AuthorizeTransportError";
    }
}

export type AuthorizeChargeResult =
    | {
        status: "approved";
        transactionId: string;
        responseCode: "1";
        responseMessage?: string;
        avsResultCode?: string;
        cavvResultCode?: string;
    }
    | {
        status: "held";
        transactionId?: string;
        responseCode: "4";
        responseMessage?: string;
        avsResultCode?: string;
        cavvResultCode?: string;
    }
    | {
        status: "failed";
        transactionId?: string;
        responseCode: "2" | "3";
        responseMessage: string;
        failureCode: string;
        avsResultCode?: string;
        cavvResultCode?: string;
    };

export function authorizeMerchantCustomerId(memberId: string) {
    return `m_${createHash("sha256").update(memberId).digest("hex").slice(0, 18)}`;
}

export class AuthorizePaymentGateway {
    constructor(
        private readonly apiLoginId: string,
        private readonly transactionKey: string,
    ) {}

    private async request(operation: string, payload: Record<string, unknown>) {
        const url = process.env.AUTHORIZE_API_URL;
        if (!url) throw new Error("AUTHORIZE_API_URL is missing");

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
            throw new AuthorizeTransportError("Authorize.net request could not be completed", { cause });
        }

        if (!response.ok) {
            throw new AuthorizeTransportError(`Authorize.net request failed with status ${response.status}`);
        }

        const raw = await response.text();
        let value: unknown;
        try {
            value = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
        } catch (cause) {
            throw new AuthorizeTransportError("Authorize.net returned invalid JSON", { cause });
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new AuthorizeTransportError("Authorize.net returned invalid JSON");
        }
        const parsed = value as Record<string, unknown>;

        const messages = parsed.messages as Record<string, unknown> | undefined;
        const first = Array.isArray(messages?.message)
            ? messages.message[0] as Record<string, unknown> | undefined
            : undefined;
        const hasTransactionResponse = parsed.transactionResponse !== null &&
            typeof parsed.transactionResponse === "object" &&
            !Array.isArray(parsed.transactionResponse);
        if (messages?.resultCode !== "Ok" && !hasTransactionResponse) {
            throw new AuthorizeApiError(
                typeof first?.code === "string" ? first.code : "AUTHORIZE_ERROR",
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
        const profile = response.profile ?? response.customerProfile;
        if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
            throw new AuthorizeTransportError("Authorize.net did not return a customer profile");
        }
        return profile as AuthorizeCustomerProfile;
    }

    async createCustomerProfile(input: {
        memberId: string;
        firstName: string;
        lastName: string | null;
        email: string;
    }) {
        const response = await this.request("createCustomerProfileRequest", {
            profile: {
                merchantCustomerId: authorizeMerchantCustomerId(input.memberId),
                description: `${input.firstName} ${input.lastName ?? ""}`.trim() || input.memberId,
                email: input.email,
            },
        });
        const profile = (response.profile ?? response.customerProfile ?? {}) as AuthorizeCustomerProfile;
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
            validationMode: process.env.AUTHORIZE_API_URL?.includes("apitest.authorize.net")
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
            idempotencyKey: string;
            orderDescription: string;
        },
    ): Promise<AuthorizeChargeResult> {
        if (!Number.isSafeInteger(options.total) || options.total < 1) {
            throw new Error("Charge total must be a positive integer in cents");
        }

        const response = await this.request("createTransactionRequest", {
            refId: createHash("sha256").update(options.idempotencyKey).digest("hex").slice(0, 20),
            transactionRequest: {
                transactionType: "authCaptureTransaction",
                amount: (options.total / 100).toFixed(2),
                currencyCode: options.currency,
                order: { description: options.orderDescription },
                profile: {
                    customerProfileId,
                    paymentProfile: { paymentProfileId },
                },
                transactionSettings: {
                    setting: [{ settingName: "duplicateWindow", settingValue: "600" }],
                },
                processingOptions: { isStoredCredentials: true },
            },
        });
        const transaction = response.transactionResponse as Record<string, unknown> | undefined;
        const responseCode = String(transaction?.responseCode ?? "");
        const transactionId = typeof transaction?.transId === "string" && transaction.transId !== "0"
            ? transaction.transId
            : undefined;
        const errors = transaction?.errors as Record<string, unknown> | undefined;
        const firstError = Array.isArray(errors?.error)
            ? errors.error[0] as Record<string, unknown> | undefined
            : undefined;
        const messages = transaction?.messages as Record<string, unknown> | undefined;
        const firstMessage = Array.isArray(messages?.message)
            ? messages.message[0] as Record<string, unknown> | undefined
            : undefined;
        const responseMessage = typeof firstError?.errorText === "string"
            ? firstError.errorText
            : typeof firstMessage?.description === "string"
                ? firstMessage.description
                : undefined;
        const base = {
            transactionId,
            responseCode,
            responseMessage,
            avsResultCode: typeof transaction?.avsResultCode === "string" ? transaction.avsResultCode : undefined,
            cavvResultCode: typeof transaction?.cavvResultCode === "string" ? transaction.cavvResultCode : undefined,
        };

        if (responseCode === "1") {
            if (!transactionId) throw new AuthorizeTransportError("Authorize.net approved without a transaction ID");
            return { ...base, status: "approved", transactionId, responseCode: "1" };
        }
        if (responseCode === "4") {
            return { ...base, status: "held", responseCode: "4" };
        }
        if (responseCode === "2" || responseCode === "3") {
            return {
                ...base,
                status: "failed",
                responseCode,
                responseMessage: responseMessage ?? "Authorize.net declined the transaction",
                failureCode: String(firstError?.errorCode ?? transaction?.responseReasonCode ?? responseCode),
            };
        }
        throw new AuthorizeTransportError(`Authorize.net returned unknown response code: ${responseCode || "missing"}`);
    }

    async getTransactionDetails(transactionId: string): Promise<AuthorizeTransactionDetails> {
        const response = await this.request("getTransactionDetailsRequest", { transId: transactionId });
        const transaction = response.transaction;
        if (!transaction || typeof transaction !== "object" || Array.isArray(transaction)) {
            throw new AuthorizeTransportError("Authorize.net did not return transaction details");
        }
        return transaction as AuthorizeTransactionDetails;
    }

    async voidTransaction(transactionId: string): Promise<AuthorizeTransactionDetails> {
        return this.followOnTransaction("voidTransaction", transactionId);
    }

    async refundTransaction(transactionId: string, total: number): Promise<AuthorizeTransactionDetails> {
        if (!Number.isSafeInteger(total) || total < 1) {
            throw new Error("Refund total must be a positive integer in cents");
        }
        return this.followOnTransaction("refundTransaction", transactionId, {
            amount: (total / 100).toFixed(2),
        });
    }

    private async followOnTransaction(
        transactionType: "voidTransaction" | "refundTransaction",
        transactionId: string,
        extra?: Record<string, unknown>,
    ): Promise<AuthorizeTransactionDetails> {
        const response = await this.request("createTransactionRequest", {
            transactionRequest: {
                transactionType,
                refTransId: transactionId,
                ...extra,
            },
        });
        const transaction = response.transactionResponse;
        if (!transaction || typeof transaction !== "object" || Array.isArray(transaction)) {
            throw new AuthorizeTransportError("Authorize.net did not return a follow-on transaction");
        }
        const responseCode = String((transaction as Record<string, unknown>).responseCode ?? "");
        if (responseCode !== "1") {
            const errors = (transaction as Record<string, unknown>).errors as Record<string, unknown> | undefined;
            const first = Array.isArray(errors?.error)
                ? errors.error[0] as Record<string, unknown> | undefined
                : undefined;
            throw new AuthorizeApiError(
                typeof first?.errorCode === "string" ? first.errorCode : responseCode || "AUTHORIZE_FOLLOW_ON_FAILED",
                typeof first?.errorText === "string" ? first.errorText : "Authorize.net follow-on transaction failed",
            );
        }
        return transaction as AuthorizeTransactionDetails;
    }
}
