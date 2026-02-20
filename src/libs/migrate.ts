import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const MIGRATION_AGENT_PROMPT = `You are an expert data migration assistant for Monstro, a membership management platform.

Your task is to analyze CSV data to help customer service representatives map columns to required fields, identify data quality issues, and match pricing/plan information.

## Context
You will receive:
1. CSV headers and sample data (up to 20 rows)
2. Available pricing plans and their pricing options for the location

## Your Responsibilities

### 1. Column Classification
For each CSV column header, determine which Monstro field it should map to:
- Required fields: firstName, lastName, email, phone, lastRenewalDate
- Optional fields: classCredits, paymentTermsLeft, backdateStartDate, termEndDate, pricingPlanId

### 2. Value Validation
Identify formatting/data quality issues and provide suggestedFix as only the final replacement cell value (no instructions).

### 3. Pricing Matching
For pricing/plan-like columns, match to provided pricing options and always return pricingId for matched values.`;

const ColumnMappingSchema = z.object({
    csvHeader: z.string(),
    suggestedField: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
});

const ValueIssueSchema = z.object({
    columnName: z.string(),
    rowIndex: z.number(),
    originalValue: z.string(),
    issue: z.string(),
    suggestedFix: z.string(),
});

const PricingMatchSchema = z.object({
    columnName: z.string(),
    csvValue: z.string(),
    pricingId: z.string(),
    planName: z.string(),
    pricingName: z.string(),
    matchedFrom: z.enum(["exact", "semantic"]),
    confidence: z.number().min(0).max(1),
});

const AnalysisResultSchema = z.object({
    columnMapping: z.array(ColumnMappingSchema),
    valueIssues: z.array(ValueIssueSchema),
    pricingMatches: z.array(PricingMatchSchema),
});

export type PricingPlanInput = {
    id: string;
    planId: string;
    planName: string;
    pricingName: string;
    price: number;
    interval?: string;
};

export type AnalyzeParams = {
    csvData: Record<string, string>[];
    headers: string[];
    availablePricingPlans: PricingPlanInput[];
};

export type ColumnMappingResult = z.infer<typeof ColumnMappingSchema>;

export type ValueIssueResult = {
    rowIndex: number;
    originalValue: string;
    issue: string;
    suggestedFix: string;
};

export type PricingMatchResult = {
    csvValue: string;
    pricingId: string;
    planName: string;
    pricingName: string;
    matchedFrom: "exact" | "semantic";
    confidence: number;
};

export type MigrationAnalysisResult = {
    columnMapping: Record<string, ColumnMappingResult>;
    valueIssues: Record<string, ValueIssueResult[]>;
    pricingMatches: Record<string, PricingMatchResult[]>;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
};

function buildAnalysisPrompt(params: AnalyzeParams): string {
    const { csvData, headers, availablePricingPlans } = params;
    const sampleData = csvData.slice(0, 20);

    const headersInfo = headers.map((header) => {
        const values = sampleData.map((row) => row[header]).filter((v) => v?.trim()).slice(0, 5);
        return `- "${header}": sample values: [${values.map((v) => `"${v}"`).join(", ")}]`;
    }).join("\n");

    const sampleRowsInfo = sampleData.slice(0, 5).map((row, idx) => `Row ${idx + 1}: ${JSON.stringify(row)}`).join("\n");

    const plansInfo = availablePricingPlans.length > 0
        ? availablePricingPlans
            .map((plan) => `- Plan: "${plan.planName}", Pricing: "${plan.pricingName}", ID: ${plan.id}, Price: $${(plan.price / 100).toFixed(2)}${plan.interval ? `/${plan.interval}` : ""}`)
            .join("\n")
        : "No pricing plans available for this location.";

    return `Analyze the following CSV import data for a membership migration.

## CSV Headers and Sample Values
${headersInfo}

## Sample Rows
${sampleRowsInfo}

## Available Pricing Plans
${plansInfo}`;
}

export async function analyzeCsvMigration(params: AnalyzeParams): Promise<MigrationAnalysisResult> {
    let tokenUsage: { promptTokens: number; completionTokens: number } | undefined;

    const model = new ChatOpenAI({
        model: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        temperature: 0,
        maxRetries: 3,
        callbacks: [{
            handleLLMEnd: (output) => {
                const usage = output.llmOutput?.tokenUsage;
                if (!usage) return;

                tokenUsage = {
                    promptTokens: Number(usage.promptTokens || 0),
                    completionTokens: Number(usage.completionTokens || 0),
                };
            },
        }],
    });

    const structuredLlm = model.withStructuredOutput(AnalysisResultSchema, {
        name: "csv_analysis",
    });

    const prompt = buildAnalysisPrompt(params);

    const validated = await structuredLlm.invoke([
        new SystemMessage(MIGRATION_AGENT_PROMPT),
        new HumanMessage(prompt),
    ]);

    const columnMapping: Record<string, ColumnMappingResult> = {};
    for (const mapping of validated.columnMapping) {
        columnMapping[mapping.csvHeader] = {
            csvHeader: mapping.csvHeader,
            suggestedField: mapping.suggestedField,
            confidence: mapping.confidence,
            reasoning: mapping.reasoning,
        };
    }

    const valueIssues: Record<string, ValueIssueResult[]> = {};
    for (const issue of validated.valueIssues) {
        if (!valueIssues[issue.columnName]) {
            valueIssues[issue.columnName] = [];
        }
        valueIssues[issue.columnName]!.push({
            rowIndex: issue.rowIndex,
            originalValue: issue.originalValue,
            issue: issue.issue,
            suggestedFix: issue.suggestedFix,
        });
    }

    const pricingMatches: Record<string, PricingMatchResult[]> = {};
    for (const match of validated.pricingMatches) {
        if (!pricingMatches[match.columnName]) {
            pricingMatches[match.columnName] = [];
        }
        pricingMatches[match.columnName]!.push({
            csvValue: match.csvValue,
            pricingId: match.pricingId,
            planName: match.planName,
            pricingName: match.pricingName,
            matchedFrom: match.matchedFrom,
            confidence: match.confidence,
        });
    }

    return {
        columnMapping,
        valueIssues,
        pricingMatches,
        usage: tokenUsage,
    };
}
