import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { and, eq, inArray } from "drizzle-orm";
import { memberPlans, memberPlanPricing, locations } from "@subtrees/schemas";
import { analyzeCsvMigration, type PricingPlanInput } from "@/libs/migrate";
import { calculateAICost } from "@/libs/ai";
import { chargeWallet } from "@/libs/wallet";

const MIN_ANALYZE_WALLET_UNITS = 1;
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

        const wallet = await db.query.wallets.findFirst({
            where: (wallets, { eq }) => eq(wallets.locationId, lid),
            columns: {
                balance: true,
                credits: true,
            },
        });

        if (!wallet) {
            return status(404, {
                error: "Wallet not found for this location",
                code: "WALLET_NOT_FOUND",
            });
        }

        const available = wallet.balance + wallet.credits;
        if (available < MIN_ANALYZE_WALLET_UNITS) {
            return status(402, {
                error: "Insufficient wallet balance for AI analysis",
                code: "WALLET_INSUFFICIENT",
                required: MIN_ANALYZE_WALLET_UNITS,
                available,
                shortfall: MIN_ANALYZE_WALLET_UNITS - available,
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

            const location = await db.query.locations.findFirst({
                where: eq(locations.id, lid),
                columns: {
                    vendorId: true,
                },
            });

            const usage = result.usage;
            const walletCharge = usage
                ? calculateAICost(usage, MIGRATION_MODEL)
                : MIN_ANALYZE_WALLET_UNITS;

            if (walletCharge > 0) {
                const charged = await chargeWallet({
                    lid,
                    vendorId: location?.vendorId || "",
                    amount: walletCharge,
                    description: "CSV migration AI analysis",
                });

                if (!charged) {
                    return status(402, {
                        error: "Insufficient wallet balance to charge AI analysis",
                        code: "WALLET_CHARGE_FAILED",
                        required: walletCharge,
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
