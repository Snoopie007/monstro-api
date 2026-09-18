import { db } from "@/db/db";
import { adsCustomer } from "@/libs/google";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
    integrations,
    locations,
    programs,
} from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { enums, services } from "google-ads-api";
import { z } from "zod";

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
        console.log("idea", idea.text, idea.keyword_idea_metrics?.avg_monthly_searches);
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
            new SystemMessage("Translate an activity program into how people search Google. Return 5-10 generic search seeds, not brand or program nicknames. Match the age range and activity (HIIT, gym, martial arts, kids class, etc). Prefer class-style terms when relevant. No quotes, no city names."),
            new HumanMessage(`Program: ${program.name}\nDescription: ${program.description || "none"}\nAges: ${program.minAge}-${program.maxAge}\nCity/state: ${city}${region ? `, ${region}` : ""}`),
        ]);

        console.log("seeds", seeds);

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
        console.log("keywords", keywords);
        return status(200, keywords);
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            programId: t.String(),
        }),
    })
    .post("/write-ads", async (ctx) => {
        const { status } = ctx;
        return status(200, { success: true });
    });