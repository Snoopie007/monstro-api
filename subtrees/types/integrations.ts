import { integrations } from "../schemas/integrations";
import type { AdsSettings } from "./ads";
import type { Location } from "./location";



export type IntegrationMetadata = {
    squareLocationId?: string;
    publicClientKey?: string;
    loginCustomerId?: string;
}

export type Integration = typeof integrations.$inferSelect & {
    location?: Location;
    metadata?: IntegrationMetadata;
    adsSettings?: AdsSettings;
}
