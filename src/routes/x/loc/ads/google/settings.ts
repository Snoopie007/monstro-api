import { db } from "@/db/db";
import { AdsSetupError } from "@/libs/google";
import { adsSettings } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

export async function loadAdsSettings(lid: string, settingsId: string) {
    const settings = await db.query.adsSettings.findFirst({
        where: eq(adsSettings.id, settingsId),
        with: { integration: true },
    });
    if (!settings?.integration || settings.integration.locationId !== lid) {
        throw new AdsSetupError("Ads settings not found", 404);
    }

    const { integration } = settings;
    if (integration.service !== "adwords") {
        throw new AdsSetupError("Google Ads is not connected for this location");
    }
    if (!integration.accountId) {
        throw new AdsSetupError("Select a Google Ads customer first");
    }
    if (!integration.refreshToken) {
        throw new AdsSetupError("Google Ads is missing a refresh token. Reconnect the integration.");
    }

    return {
        ...settings,
        integration: {
            ...integration,
            accountId: integration.accountId,
            refreshToken: integration.refreshToken,
        },
    };
}
