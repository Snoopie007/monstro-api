import { db } from "@/db/db";
import {
    AdsSetupError, adsErrorMessage,
    ensureMxAssets, ensureMxConversionActions, findAdsLocationAsset
} from "@/libs/google";
import { adsSettings, locations, websiteSiteLocations } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { loadAdsSettings } from "./settings";

const Params = t.Object({
    lid: t.String(),
    settingsId: t.String(),
});

export const xGoogleAdsSetup = new Elysia({ prefix: "/:settingsId/setup" })
    .guard({ params: Params })
    .post("/conversions", async ({ params, status }) => {
        const { lid, settingsId } = params;
        try {
            const settings = await loadAdsSettings(lid, settingsId);
            const { integration } = settings;
            const conversionActions = await ensureMxConversionActions(
                integration.accountId,
                integration.refreshToken,
                integration.metadata?.loginCustomerId,
            );
            await db.update(adsSettings).set({
                conversionActions,
                setup: { ...settings.setup, conversions: true },
                updated: new Date(),
            }).where(eq(adsSettings.id, settingsId));
            return status(200, { success: true, conversionActions });
        } catch (error) {
            if (error instanceof AdsSetupError) {
                return status(error.status, { error: error.message });
            }
            console.error("Failed to create ads conversions:", error);
            return status(500, { error: adsErrorMessage(error, "Failed to set up conversion actions") });
        }
    })
    .post("/assets", async ({ params, status }) => {
        const { lid, settingsId } = params;
        try {
            const settings = await loadAdsSettings(lid, settingsId);
            const { integration } = settings;

            const location = await db.query.locations.findFirst({
                where: (l, { eq }) => eq(l.id, lid),
                columns: { website: true, phone: true, country: true },
            });
            if (!location) return status(404, { error: "Location not found" });

            // Prefer published site revision config (paths + program names) over editor draft tables.
            let pages: { pageKey: string; path: string }[] = [];
            let programs: { name: string; slug: string }[] = [];
            const siteLocation = await db.query.websiteSiteLocations.findFirst({
                where: (wsl, { eq }) => eq(wsl.locationId, lid),
            });
            if (siteLocation) {
                const siteRevision = await db.query.websiteSiteRevisions.findFirst({
                    where: (wsr, { eq }) => eq(wsr.siteId, siteLocation.siteId),
                    columns: { config: true },
                    orderBy: (wsr, { desc }) => desc(wsr.revisionNumber),
                });
                const config = siteRevision?.config;
                pages = (config?.pages ?? [])
                    .filter((page) => page.path && page.id)
                    .map((page) => ({ pageKey: page.id, path: page.path }));
                // Only programs with learn-more pages get individual sitelinks.
                programs = (config?.content?.programs ?? [])
                    .filter((program) => program.visible !== false && program.showLearnMore !== false && program.slug && program.name)
                    .map((program) => ({ name: program.name, slug: program.slug }));
            }

            const assets = await ensureMxAssets(
                integration.accountId,
                integration.refreshToken,
                {
                    website: location.website ?? undefined,
                    phone: location.phone ?? undefined,
                    country: location.country ?? undefined,
                    pages,
                    programs,
                },
                integration.metadata?.loginCustomerId,
            );
            await db.update(adsSettings).set({
                setup: { ...settings.setup, assets: true },
                updated: new Date(),
            }).where(eq(adsSettings.id, settingsId));
            return status(200, { success: true, assets });
        } catch (error) {
            if (error instanceof AdsSetupError) {
                return status(error.status, { error: error.message });
            }
            console.error("Failed to create ads assets:", error);
            return status(500, { error: adsErrorMessage(error, "Failed to set up ads assets") });
        }
    })
    .post("/gbp", async ({ params, status }) => {
        const { lid, settingsId } = params;
        try {
            const settings = await loadAdsSettings(lid, settingsId);
            const { integration } = settings;
            const locationAsset = await findAdsLocationAsset(
                integration.accountId,
                integration.refreshToken,
                integration.metadata?.loginCustomerId,
            );
            if (!locationAsset) {
                return status(400, {
                    error: "Link a Google Business Profile location to this Google Ads account",
                });
            }

            await db.update(adsSettings).set({
                setup: { ...settings.setup, gbp: true },
                updated: new Date(),
            }).where(eq(adsSettings.id, settingsId));
            return status(200, { success: true, locationAsset });
        } catch (error) {
            if (error instanceof AdsSetupError) {
                return status(error.status, { error: error.message });
            }
            console.error("Failed to verify ads GBP location asset:", error);
            return status(500, { error: adsErrorMessage(error, "Failed to verify Google Business Profile in Google Ads") });
        }
    });
