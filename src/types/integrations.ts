export type Integration = {
    id?: number;
    locationId: number;
    service: string;
    apiKey: string | null;
    secretKey: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    integrationId: string;
    expires?: number | null;
    settings: Record<string, unknown>;
    created?: Date;
    updated?: Date | null;
    deleted?: Date | null;

}

