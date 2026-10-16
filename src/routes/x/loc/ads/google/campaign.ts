import { db } from "@/db/db";
import { adsCustomer } from "@/libs/google";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
    integrations,
    locations,
    programs,
} from "@/subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { enums, services } from "google-ads-api";
import { z } from "zod";
import { KEYWORD_SEED_PROMPT, SEARCH_AD_PROMPT } from "./utils/prompts";

function hasLocalIntent(keyword: string, city: string, kidsProgram: boolean) {
    if (keyword.includes("near me") || keyword.includes("class")) return true;
    if (city && keyword.includes(city)) return true;
    if (kidsProgram && keyword.includes("kids")) return true;
    return false;
}

function rankKeywordIdeas(
    ideas: services.IGenerateKeywordIdeaResult[],
    programName: string,
    city: string | null,
    maxAge: number,
) {
    const brand = programName.toLowerCase();
    const cityName = city?.toLowerCase() || "";
    const kidsProgram = maxAge <= 12;
    const ranked = [];

    for (const idea of ideas) {
        const text = idea.text?.trim();
        const searches = Number(idea.keyword_idea_metrics?.avg_monthly_searches || 0);
        if (!text || searches <= 0) continue;
        if (brand && text.toLowerCase().includes(brand) && searches <= 10) continue;

        const score = searches * (hasLocalIntent(text.toLowerCase(), cityName, kidsProgram) ? 1.5 : 1);
        ranked.push({ text, avgMonthlySearches: searches, score });
    }

    return ranked
        .sort((left, right) => right.score - left.score)
        .slice(0, 30)
        .map(({ text }) => text);
}

export const xGoogleAdsCampaign = new Elysia()
    .post("/keywords", async (ctx) => {
        const { params, body, status } = ctx;
        const { lid } = params;

        const location = await db.query.locations.findFirst({
            where: eq(locations.id, lid),
            columns: { id: true, city: true, country: true, state: true },
        });
        if (!location) return status(404, { error: "Location not found" });

        const city = location.city;
        const region = location.state;
        const country = location.country;

        const integration = await db.query.integrations.findFirst({
            where: and(eq(integrations.locationId, lid), eq(integrations.service, "adwords")),
        });

        if (!integration?.accountId || !integration.refreshToken) {
            return status(400, { error: "Google Ads is not connected for this location" });
        }

        const customerId = integration.accountId;
        const customer = adsCustomer(
            customerId,
            integration.refreshToken,
            integration.metadata?.loginCustomerId,
        );

        let geoTarget = "geoTargetConstants/2840";
        if (city) {
            const safeCity = city.replace(/'/g, "");
            const geoRows = await customer.query(`
				SELECT
					geo_target_constant.resource_name,
					geo_target_constant.name,
					geo_target_constant.canonical_name,
					geo_target_constant.target_type
				FROM geo_target_constant
				WHERE geo_target_constant.name = '${safeCity}'
					AND geo_target_constant.country_code = '${country}'
					AND geo_target_constant.status = 'ENABLED'
			`);
            for (const row of geoRows) {
                const geo = row.geo_target_constant;
                if (!geo?.resource_name) continue;
                const canonical = (geo.canonical_name || "").toLowerCase();
                const isCity = geo.target_type === "City";
                const matchesRegion = !region || canonical.includes(region.toLowerCase());
                if (isCity && matchesRegion) {
                    geoTarget = geo.resource_name;
                    break;
                }
                if (geoTarget === "geoTargetConstants/2840") {
                    geoTarget = geo.resource_name;
                }
            }
        }

        const program = await db.query.programs.findFirst({
            where: and(eq(programs.id, body.programId), eq(programs.locationId, lid)),
            columns: {
                id: true,
                name: true,
                description: true,
                minAge: true,
                maxAge: true,
            },
        });
        if (!program) return status(404, { error: "Program not found" });

        const { seeds } = await new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: 2,
        }).withStructuredOutput(
            z.object({
                seeds: z.array(z.string().min(1)).min(5).max(10),
            }), { name: "search_seeds" }
        ).invoke([
            new SystemMessage(KEYWORD_SEED_PROMPT),
            new HumanMessage(`Program: ${program.name}\nDescription: ${program.description || "none"}\nAges: ${program.minAge}-${program.maxAge}\nCity/state: ${city}${region ? `, ${region}` : ""}`),
        ]);


        const ideas = await customer.keywordPlanIdeas.generateKeywordIdeas({
            customer_id: customerId,
            language: "languageConstants/1000",
            geo_target_constants: [geoTarget],
            keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
            include_adult_keywords: false,
            page_size: 100,
            keyword_seed: { keywords: seeds },
        } as services.GenerateKeywordIdeasRequest);

        const keywordIdeas = Array.isArray(ideas) ? ideas : ideas.results || [];
        const keywords = rankKeywordIdeas(keywordIdeas, program.name, city, program.maxAge);

        return status(200, keywords);
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            programId: t.String(),
        }),
    })
    .post("/creatives", async ({ params, body, status }) => {
        const { lid } = params;
        const { programId, offer, keywords } = body;

        const location = await db.query.locations.findFirst({
            where: eq(locations.id, lid),
            columns: { id: true, name: true, city: true, state: true },
        });
        if (!location) return status(404, { error: "Location not found" });

        const program = await db.query.programs.findFirst({
            where: (p, { eq, and }) => eq(p.id, programId),
            columns: {
                id: true,
                name: true,
                description: true,
                minAge: true,
                maxAge: true,
            },
        });
        if (!program) return status(404, { error: "Program not found" });

        const creative = await new ChatOpenAI({
            model: "gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: 2,
        }).withStructuredOutput(
            z.object({
                ads: z.array(z.object({
                    headlines: z.array(z.string().min(1).max(30)).length(3),
                    descriptions: z.array(z.string().min(1).max(90)).length(2),
                })).length(2),
            }),
            { name: "search_ads" },
        ).invoke([
            new SystemMessage(SEARCH_AD_PROMPT),
            new HumanMessage([
                `Offer: ${offer}`,
                `School: ${location.name}`,
                `City: ${location.city || "unknown"}${location.state ? `, ${location.state}` : ""}`,
                `Program: ${program.name}`,
                `Description: ${program.description || "none"}`,
                `Ages: ${program.minAge}-${program.maxAge}`,
                `Keywords:\n${keywords.map((keyword) => `- ${keyword}`).join("\n")}`,
            ].join("\n")),
        ]);

        const primaryHeadline = offer.trim();
        if (primaryHeadline.length > 0 && primaryHeadline.length <= 30) {
            for (const ad of creative.ads) {
                ad.headlines[0] = primaryHeadline;
            }
        }

        return status(200, creative);
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            programId: t.String(),
            offer: t.String(),
            keywords: t.Array(t.String({ minLength: 1 }), { minItems: 1, maxItems: 30 }),
        }),
    });