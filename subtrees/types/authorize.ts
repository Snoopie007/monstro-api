export type AuthorizeMerchantAuthentication =
    | {
        accessToken: string;
        name?: never;
        transactionKey?: never;
    }
    | {
        accessToken?: never;
        name: string;
        transactionKey: string;
    };

export type AuthorizeOAuthToken = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    refreshTokenExpiresAt: number | null;
    scope: string;
    tokenType: string;
    clientStatus: string | null;
};
