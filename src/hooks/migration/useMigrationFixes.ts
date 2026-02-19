import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { MigrationAnalysisResult } from '@/hooks/useMigrations'

type UseMigrationFixesParams = {
    analysisResult: MigrationAnalysisResult | null
    fieldMapping: Record<string, string>
    rows: Record<string, string>[]
    originalRows: Record<string, string>[]
    setRows: Dispatch<SetStateAction<Record<string, string>[]>>
    setPreviewRows: Dispatch<SetStateAction<Record<string, string>[]>>
}

type UseMigrationFixesResult = {
    aiFixesAppliedCount: number
    pendingAiFixCount: number
    applyAiFixes: () => void
    resetAppliedCount: () => void
}

export function useMigrationFixes({
    analysisResult,
    fieldMapping,
    rows,
    originalRows,
    setRows,
    setPreviewRows,
}: UseMigrationFixesParams): UseMigrationFixesResult {
    const [aiFixesAppliedCount, setAiFixesAppliedCount] = useState(0)

    const resolveIssueRowIndex = useCallback((issueRowIndex: number) => {
        if (issueRowIndex >= 0 && issueRowIndex < rows.length) return issueRowIndex
        const oneBasedIndex = issueRowIndex - 1
        if (oneBasedIndex >= 0 && oneBasedIndex < rows.length) return oneBasedIndex
        return -1
    }, [rows.length])

    const normalizeLoose = useCallback((value: unknown) => {
        return String(value ?? '')
            .toLowerCase()
            .replace(/[",]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
    }, [])

    const getMappedFieldForColumn = useCallback((columnName: string) => {
        const match = Object.entries(fieldMapping).find(([, mappedColumn]) => mappedColumn === columnName)
        return match?.[0] || null
    }, [fieldMapping])

    const looksLikeInstruction = useCallback((value: string) => {
        const lower = value.toLowerCase()
        if (value.length > 70) return true
        return ['format', 'change', 'convert', 'remove', 'should', 'ensure', 'use ', 'example', 'e.g.']
            .some(token => lower.includes(token))
    }, [])

    const getConcreteSuggestedValue = useCallback((columnName: string, suggestedFixRaw: string, currentValueRaw?: unknown) => {
        const suggestedFix = suggestedFixRaw.trim().replace(/^"|"$/g, '')
        const currentValue = String(currentValueRaw ?? '').trim()
        const fieldKey = getMappedFieldForColumn(columnName)

        const toIsoDate = (raw: string) => {
            const parsed = new Date(raw)
            if (isNaN(parsed.getTime())) return null
            return parsed.toISOString().slice(0, 10)
        }

        if (fieldKey === 'lastRenewalDate' || fieldKey === 'backdateStartDate' || fieldKey === 'termEndDate') {
            const isoMatch = suggestedFix.match(/\b\d{4}-\d{2}-\d{2}\b/)
            if (isoMatch) return isoMatch[0]
            const usMatch = suggestedFix.match(/\b\d{2}\/\d{2}\/\d{4}\b/)
            if (usMatch) return usMatch[0]

            const parsedFromSuggestion = suggestedFix ? toIsoDate(suggestedFix) : null
            if (parsedFromSuggestion) return parsedFromSuggestion

            const parsedFromCurrent = currentValue ? toIsoDate(currentValue) : null
            if (parsedFromCurrent) return parsedFromCurrent
        }

        if (fieldKey === 'phone') {
            const phoneMatch = suggestedFix.match(/(?:\+?1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/)
            if (phoneMatch) return phoneMatch[0]
        }

        if (fieldKey === 'classCredits' || fieldKey === 'paymentTermsLeft') {
            const numberMatch = suggestedFix.match(/-?\d+/)
            if (numberMatch) return numberMatch[0]
        }

        if (!suggestedFix) return null
        if (looksLikeInstruction(suggestedFix)) return null

        return suggestedFix
    }, [getMappedFieldForColumn, looksLikeInstruction])

    const pendingAiFixCount = useMemo(() => {
        if (!analysisResult?.valueIssues) return 0

        let pending = 0
        for (const [columnName, issues] of Object.entries(analysisResult.valueIssues)) {
            for (const issue of issues) {
                const resolvedRowIndex = resolveIssueRowIndex(issue.rowIndex)
                if (resolvedRowIndex === -1) continue

                const row = rows[resolvedRowIndex]
                if (!row) continue

                const originalRowValue = originalRows[resolvedRowIndex]?.[columnName]
                const suggestedFix = getConcreteSuggestedValue(columnName, issue.suggestedFix || '', row[columnName])
                if (!suggestedFix) continue

                const currentValue = row[columnName]
                const isSameAsIssue = normalizeLoose(currentValue) === normalizeLoose(issue.originalValue)
                const isSameAsOriginalRow = normalizeLoose(currentValue) === normalizeLoose(originalRowValue)

                if ((isSameAsIssue || isSameAsOriginalRow) && normalizeLoose(currentValue) !== normalizeLoose(suggestedFix)) {
                    pending += 1
                }
            }
        }

        return pending
    }, [analysisResult, resolveIssueRowIndex, rows, originalRows, getConcreteSuggestedValue, normalizeLoose])

    const applyAiFixes = useCallback(() => {
        if (!analysisResult?.valueIssues) return

        const nextRows = rows.map(row => ({ ...row }))
        let appliedCount = 0

        for (const [columnName, issues] of Object.entries(analysisResult.valueIssues)) {
            for (const issue of issues) {
                const resolvedRowIndex = resolveIssueRowIndex(issue.rowIndex)
                if (resolvedRowIndex === -1) continue

                const row = nextRows[resolvedRowIndex]
                if (!row) continue

                const originalRowValue = originalRows[resolvedRowIndex]?.[columnName]
                const currentValue = row[columnName]
                const suggestedFix = getConcreteSuggestedValue(columnName, issue.suggestedFix || '', currentValue)
                if (!suggestedFix) continue

                const isSameAsIssue = normalizeLoose(currentValue) === normalizeLoose(issue.originalValue)
                const isSameAsOriginalRow = normalizeLoose(currentValue) === normalizeLoose(originalRowValue)

                if ((isSameAsIssue || isSameAsOriginalRow) && normalizeLoose(currentValue) !== normalizeLoose(suggestedFix)) {
                    row[columnName] = suggestedFix
                    appliedCount += 1
                }
            }
        }

        if (appliedCount > 0) {
            setRows(nextRows)
            setPreviewRows(nextRows.slice(0, 10))
            setAiFixesAppliedCount(prev => prev + appliedCount)
        }
    }, [analysisResult, rows, originalRows, resolveIssueRowIndex, getConcreteSuggestedValue, normalizeLoose, setRows, setPreviewRows])

    const resetAppliedCount = useCallback(() => {
        setAiFixesAppliedCount(0)
    }, [])

    return {
        aiFixesAppliedCount,
        pendingAiFixCount,
        applyAiFixes,
        resetAppliedCount,
    }
}
