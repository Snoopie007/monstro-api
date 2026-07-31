import { integrations } from "../schemas/integrations";
import type { Location } from "./location";



export type IntegrationMetadata = {
    squareLocationId?: string;
    publicClientKey?: string;
    authorizeAuthMode?: "credentials" | "oauth";
    authorizeScope?: string;
    authorizeRefreshTokenExpiresAt?: number;
    authorizeClientStatus?: string;
}

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
    metadata?: IntegrationMetadata;
}

