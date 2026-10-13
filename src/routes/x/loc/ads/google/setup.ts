import { db } from "@/db/db";
import {
    AdsSetupError, adsErrorMessage,
    ensureMxAssets, ensureMxConversionActions, findAdsLocationAsset
} from "@/libs/google";
import { publishedAdsDestinations } from "@/libs/adsSiteDestinations";
import { adsSettings } from "@/subtrees/schemas";
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

            // Use the site's currently published revision, never an unpublished or older one.
            let destinations: ReturnType<typeof publishedAdsDestinations> = { pages: [], programs: [] };
            const siteLocation = await db.query.websiteSiteLocations.findFirst({
                where: (wsl, { eq }) => eq(wsl.locationId, lid),
            });
            const site = siteLocation
                ? await db.query.websiteSites.findFirst({
                    where: (ws, { eq }) => eq(ws.id, siteLocation.siteId),
                    columns: { plan: true, publishedRevisionId: true },
                })
                : undefined;
            if (site?.publishedRevisionId) {
                const siteRevision = await db.query.websiteSiteRevisions.findFirst({
                    where: (wsr, { and, eq }) => and(
                        eq(wsr.id, site.publishedRevisionId!),
                        eq(wsr.siteId, siteLocation!.siteId),
                        eq(wsr.status, "published"),
                    ),
                    columns: { config: true },
                });
                if (siteRevision) {
                    destinations = publishedAdsDestinations(
                        siteRevision.config,
                        site.plan === "growth" ? "growth" : "scale",
                        lid,
                    );
                }
            }

            const assets = await ensureMxAssets(
                integration.accountId,
                integration.refreshToken,
                {
                    website: location.website ?? undefined,
                    phone: location.phone ?? undefined,
                    country: location.country ?? undefined,
                    pages: destinations.pages,
                    programs: destinations.programs,
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
