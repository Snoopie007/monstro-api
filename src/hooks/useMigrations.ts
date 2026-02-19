'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { MigrateMember } from '@subtrees/types'

interface UseMigrationsParams {
    locationId: string
    page?: number
    size?: number
    enabled?: boolean
}

export type MigrationsResponse = {
    migrations: MigrateMember[]
    count: number
}

export type ColumnMappingResult = {
    csvHeader: string
    suggestedField: string | null
    confidence: number
    reasoning: string
}

export type ValueIssueResult = {
    rowIndex: number
    originalValue: string
    issue: string
    suggestedFix: string
}

export type PricingMatchResult = {
    csvValue: string
    pricingId: string
    planName: string
    pricingName: string
    matchedFrom: 'exact' | 'semantic'
    confidence: number
}

export type MigrationAnalysisResult = {
    columnMapping: Record<string, ColumnMappingResult>
    valueIssues: Record<string, ValueIssueResult[]>
    pricingMatches: Record<string, PricingMatchResult[]>
    usage?: {
        promptTokens: number
        completionTokens: number
    }
}

export type AnalyzeCsvParams = {
    csvData: Record<string, string>[]
    headers: string[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useMigrations({
    locationId,
    page = 0,
    size = 15,
    enabled = true,
}: UseMigrationsParams) {
    const queryParams = new URLSearchParams({
        page: String(page + 1),
        size: String(size),
    })

    const { data, error, isLoading, isFetching, refetch } = useQuery<MigrationsResponse>({
        queryKey: ['migrations', locationId, page, size],
        queryFn: () => fetcher(`/api/protected/loc/${locationId}/migrations?${queryParams}`),
        enabled: !!locationId && enabled,
        placeholderData: (previousData) => previousData,
        staleTime: 0,
    })

    return {
        migrations: data?.migrations ?? [],
        count: data?.count ?? 0,
        error,
        isLoading,
        isFetching,
        refetch,
    }
}

export function useAnalyzeCsv(locationId: string) {
    return useMutation({
        mutationFn: async (params: AnalyzeCsvParams): Promise<MigrationAnalysisResult> => {
            const response = await fetch(`/api/x/loc/${locationId}/migration/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to analyze CSV')
            }

            const result = await response.json()
            return result.data
        },
    })
}
