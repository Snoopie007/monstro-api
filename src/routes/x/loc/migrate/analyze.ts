import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { calculateAICost } from "@/libs/ai/AI";
import { analyzeCsvMigration, type PricingPlanInput } from "@/libs/migrate";
import { Wallet } from "@/libs/wallet";
import { memberPlans, memberPlanPricing } from "@subtrees/schemas";
import { and, eq, inArray } from "drizzle-orm";

const MIGRATION_MODEL = "gpt-4o-mini";

type AnalyzeBody = {
    csvData: Record<string, string>[];
    headers: string[];
};

export const migrationAnalyze = new Elysia()
    .post("/analyze", async ({ params, body, status }) => {
        const { lid } = params as { lid: string };
        const { csvData, headers } = body as AnalyzeBody;

        if (!csvData || !headers || headers.length === 0) {
            return status(400, { error: "Missing CSV data or headers" });
        }

        if (csvData.length === 0) {
            return status(400, { error: "CSV data is empty" });
        }

        const location = await db.query.locations.findFirst({
            where: (row, { eq }) => eq(row.id, lid),
            columns: { vendorId: true },
        });
        if (!location) {
            return status(404, { error: "Location not found" });
        }
        if (!location.vendorId) {
            return status(422, {
                error: "Location vendor is required to analyze CSV",
                code: "MISSING_VENDOR",
            });
        }

        try {
            const plans = await db.query.memberPlans.findMany({
                where: and(
                    eq(memberPlans.locationId, lid),
                    eq(memberPlans.archived, false)
                ),
                columns: {
                    id: true,
                    name: true,
                },
            });

            const planIds = plans.map((plan) => plan.id);
            const pricings = planIds.length > 0
                ? await db.query.memberPlanPricing.findMany({
                    where: inArray(memberPlanPricing.memberPlanId, planIds),
                    columns: {
                        id: true,
                        memberPlanId: true,
                        name: true,
                        price: true,
                        interval: true,
                    },
                })
                : [];

            const planNameById = new Map(plans.map((plan) => [plan.id, plan.name]));

            const availablePricingPlans: PricingPlanInput[] = pricings.map((pricing) => ({
                id: pricing.id,
                planId: pricing.memberPlanId,
                planName: planNameById.get(pricing.memberPlanId) || "Unknown Plan",
                pricingName: pricing.name,
                price: pricing.price,
                interval: pricing.interval || undefined,
            }));

            const result = await analyzeCsvMigration({
                csvData,
                headers,
                availablePricingPlans,
            });

            if (result.usage) {
                const cost = Math.max(1, calculateAICost(result.usage, MIGRATION_MODEL));
                const wallet = new Wallet(lid);
                const charged = await wallet.charge({
                    vendorId: location.vendorId,
                    amount: cost,
                    description: `CSV migration analysis`,
                });
                if (!charged) {
                    return status(402, {
                        error: "Insufficient wallet funds for migration analysis",
                        code: "WALLET_CHARGE_FAILED",
                    });
                }
            }

            return status(200, {
                success: true,
                data: result,
            });
        } catch (error) {
            console.error("Migration analysis error:", error);

            if (error instanceof Error) {
                return status(500, {
                    error: "Failed to analyze CSV",
                    message: error.message,
                });
            }

            return status(500, { error: "Failed to analyze CSV" });
        }
    }, {
        body: t.Object({
            csvData: t.Array(t.Record(t.String(), t.String())),
            headers: t.Array(t.String()),
        }),
    });
