import { db } from "@/db/db";
import {
    AdsSetupError,
    adsErrorMessage,
    createBrandCampaign,
    expandBrandMatchTypes,
    seedBrandKeywords,
    toWebsiteOrigin,
} from "@/libs/google";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { adsSettings, locations } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { z } from "zod";
import { loadAdsSettings } from "./settings";

const Params = t.Object({
    lid: t.String(),
    settingsId: t.String(),
});

export const xGoogleAdsBrand = new Elysia({ prefix: "/:settingsId" })
    .guard({ params: Params })
    .post("/brand", async ({ params, status }) => {
        const { lid, settingsId } = params;
        try {
            const settings = await loadAdsSettings(lid, settingsId);
            const { integration } = settings;

            const location = await db.query.locations.findFirst({
                where: eq(locations.id, lid),
                columns: {
                    name: true,
                    legalName: true,
                    city: true,
                    country: true,
                    website: true,
                    about: true,
                    industry: true,
                },
            });
            if (!location) return status(404, { error: "Location not found" });

            const origin = toWebsiteOrigin(location.website);
            if (!origin) {
                return status(400, { error: "Add a website to this location first" });
            }
            const finalUrl = `${origin}/`;

            const creative = await new ChatOpenAI({
                model: "gpt-4o-mini",
                apiKey: process.env.OPENAI_API_KEY,
                maxRetries: 2,
            }).withStructuredOutput(
                z.object({
                    keywords: z.array(z.string().min(2).max(80)).min(4).max(8),
                    headlines: z.array(z.string().min(1).max(30)).min(5).max(15),
                    descriptions: z.array(z.string().min(1).max(90)).min(2).max(4),
                }),
                { name: "brand_campaign" },
            ).invoke([
                new SystemMessage("You write Google Search brand campaigns for a local school. Return only brand keywords people type for THIS school (name, legal name, city + name). No generic class terms, no competitor names, no quotes, no match-type punctuation. Headlines max 30 characters, descriptions max 90. Ads send people to the homepage. Do not invent discounts or claims not in the brief."),
                new HumanMessage([
                    `Name: ${location.name}`,
                    `Legal name: ${location.legalName || "none"}`,
                    `City: ${location.city || "unknown"}`,
                    `Country: ${location.country}`,
                    `Industry: ${location.industry || "none"}`,
                    `About: ${location.about || "none"}`,
                    `Homepage: ${finalUrl}`,
                    settings.instructions ? `School notes: ${settings.instructions}` : "",
                ].filter(Boolean).join("\n")),
            ]);

            const keywords = expandBrandMatchTypes([
                ...seedBrandKeywords(location),
                ...creative.keywords,
            ]);
            if (!keywords.length) {
                return status(400, { error: "Could not generate brand keywords" });
            }

            const campaign = await createBrandCampaign({
                customerId: integration.accountId,
                refreshToken: integration.refreshToken,
                loginCustomerId: integration.metadata?.loginCustomerId,
                locationName: location.name,
                finalUrl,
                keywords,
                headlines: creative.headlines,
                descriptions: creative.descriptions,
                dailyBudgetMicros: settings.maxSpendMicros
                    ? Math.min(settings.maxSpendMicros, 10_000_000)
                    : 10_000_000,
            });

            await db.update(adsSettings).set({
                runningCampaigns: [...new Set([...(settings.runningCampaigns ?? []), campaign.campaignId])],
                setup: { ...settings.setup, brand: true },
                updated: new Date(),
            }).where(eq(adsSettings.id, settingsId));

            return status(200, { success: true, ...campaign });
        } catch (error) {
            if (error instanceof AdsSetupError) {
                return status(error.status, { error: error.message });
            }
            console.error("Failed to create brand quick-win campaign:", error);
            return status(500, { error: adsErrorMessage(error, "Failed to create brand campaign") });
        }
    });
