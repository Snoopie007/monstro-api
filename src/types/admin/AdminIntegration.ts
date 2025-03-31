export type AdminIntegration = {
    id?: number
    service: string
    secretKey: string | null
    apiKey: string | null
    accessToken: string | null
    refreshToken: string | null
    expires: number | null
    tokenType: string | null
    scope: string | null
    providerId: string
    settings: Record<string, unknown> | null
    created?: Date
    updated?: Date | null
}
