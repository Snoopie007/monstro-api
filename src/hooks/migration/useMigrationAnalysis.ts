import { useCallback, useState } from 'react'
import { useAnalyzeCsv, type MigrationAnalysisResult } from '@/hooks/useMigrations'

type UseMigrationAnalysisResult = {
    aiAnalysisResult: MigrationAnalysisResult | null
    isAiAnalyzing: boolean
    aiAnalysisError: string | null
    pricingIdMapping: Record<string, Record<string, string>>
    runAnalysis: (params: { headers: string[]; rows: Record<string, string>[] }) => Promise<MigrationAnalysisResult | null>
    resetAnalysis: () => void
    getAutoMappings: (threshold?: number) => Record<string, string>
}

export function useMigrationAnalysis(locationId: string): UseMigrationAnalysisResult {
    const analyzeCsvMutation = useAnalyzeCsv(locationId)

    const [aiAnalysisResult, setAiAnalysisResult] = useState<MigrationAnalysisResult | null>(null)
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
    const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null)
    const [pricingIdMapping, setPricingIdMapping] = useState<Record<string, Record<string, string>>>({})

    const resetAnalysis = useCallback(() => {
        setAiAnalysisResult(null)
        setAiAnalysisError(null)
        setPricingIdMapping({})
    }, [])

    const runAnalysis = useCallback(async ({ headers, rows }: { headers: string[]; rows: Record<string, string>[] }) => {
        if (!headers.length || !rows.length) return null

        setIsAiAnalyzing(true)
        setAiAnalysisError(null)

        try {
            const result = await analyzeCsvMutation.mutateAsync({
                csvData: rows,
                headers,
            })

            setAiAnalysisResult(result)

            const nextPricingIdMapping: Record<string, Record<string, string>> = {}
            for (const [columnName, matches] of Object.entries(result.pricingMatches)) {
                nextPricingIdMapping[columnName] = {}
                for (const match of matches) {
                    nextPricingIdMapping[columnName][match.csvValue] = match.pricingId
                }
            }
            setPricingIdMapping(nextPricingIdMapping)
            return result
        } catch (error) {
            console.error('AI analysis error:', error)
            setAiAnalysisError(error instanceof Error ? error.message : 'Failed to analyze CSV')
            return null
        } finally {
            setIsAiAnalyzing(false)
        }
    }, [analyzeCsvMutation])

    const getAutoMappings = useCallback((threshold = 0.75) => {
        if (!aiAnalysisResult?.columnMapping) return {}

        const autoMappings: Record<string, string> = {}
        for (const [csvHeader, mapping] of Object.entries(aiAnalysisResult.columnMapping)) {
            if (mapping.suggestedField && mapping.confidence >= threshold) {
                autoMappings[mapping.suggestedField] = csvHeader
            }
        }

        return autoMappings
    }, [aiAnalysisResult])

    return {
        aiAnalysisResult,
        isAiAnalyzing,
        aiAnalysisError,
        pricingIdMapping,
        runAnalysis,
        resetAnalysis,
        getAutoMappings,
    }
}
