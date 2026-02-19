'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
    InteractiveStepper,
    InteractiveStepperItem,
    InteractiveStepperIndicator,
    InteractiveStepperTitle,
    InteractiveStepperSeparator,
    InteractiveStepperContent,
    IStepperMethods,
} from '@/components/ui/stepper'
import { SelectSourceStep } from './SelectSourceStep'
import { MapFieldsStep } from './MapFieldsStep'
import { PreviewStep } from './PreviewStep'
import { StepperFooter } from './StepperFooter'
import { useAnalyzeCsv, type MigrationAnalysisResult } from '@/hooks/useMigrations'
import type { CustomFieldDefinition, CustomFieldType } from '@/types/member'
import { cn } from '@/libs/utils'

export type ImportSource = 'csv' | 'gohighlevel' | null

export interface NewCustomField {
    csvColumn: string
    fieldName: string
    fieldType: CustomFieldType
    selected: boolean
    sampleValues: string[]
}

interface ImportStepperPageProps {
    lid: string
}

// Infer field type from CSV values
function inferFieldType(values: string[]): CustomFieldType {
    const nonEmpty = values.filter(v => v?.trim())
    if (nonEmpty.length === 0) return 'text'

    // Check if all values are dates (YYYY-MM-DD or common formats)
    const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/
    if (nonEmpty.every(v => datePattern.test(v))) return 'date'

    // Check if all values are numbers
    if (nonEmpty.every(v => !isNaN(Number(v)) && v.trim() !== '')) return 'number'

    // Check if all values are boolean-like
    const boolValues = ['true', 'false', 'yes', 'no', '1', '0']
    if (nonEmpty.every(v => boolValues.includes(v.toLowerCase()))) return 'boolean'

    // Check if limited unique values (might be select)
    const unique = new Set(nonEmpty.map(v => v.toLowerCase()))
    if (unique.size <= 5 && nonEmpty.length >= 3) return 'select'

    return 'text'
}

export function ImportStepperPage({ lid }: ImportStepperPageProps) {
    const stepperRef = useRef<HTMLDivElement & IStepperMethods>(null)

    const [importSource, setImportSource] = useState<ImportSource>(null)
    const [file, setFile] = useState<File | undefined>(undefined)
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [originalCsvFullData, setOriginalCsvFullData] = useState<Record<string, string>[]>([])
    const [csvPreviewData, setCsvPreviewData] = useState<Record<string, string>[]>([])
    const [csvFullData, setCsvFullData] = useState<Record<string, string>[]>([])
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
    const [isImporting, setIsImporting] = useState(false)

    // AI Analysis state
    const [aiAnalysisResult, setAiAnalysisResult] = useState<MigrationAnalysisResult | null>(null)
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
    const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null)
    const [aiFixesAppliedCount, setAiFixesAppliedCount] = useState(0)
    const [pricingIdMapping, setPricingIdMapping] = useState<Record<string, Record<string, string>>>({})
    
    const analyzeCsvMutation = useAnalyzeCsv(lid)

    // Custom fields state
    const [existingCustomFields, setExistingCustomFields] = useState<CustomFieldDefinition[]>([])
    const [customFieldMapping, setCustomFieldMapping] = useState<Record<string, string>>({})
    const [newCustomFields, setNewCustomFields] = useState<NewCustomField[]>([])
    const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(true)
    const [includeCustomFields, setIncludeCustomFields] = useState(false)

    // Fetch existing custom field definitions
    useEffect(() => {
        async function fetchCustomFields() {
            try {
                const response = await fetch(`/api/protected/loc/${lid}/cfs`)
                const data = await response.json()
                if (data.success) {
                    setExistingCustomFields(data.data || [])
                }
            } catch (error) {
                console.error('Error fetching custom fields:', error)
            } finally {
                setIsLoadingCustomFields(false)
            }
        }
        fetchCustomFields()
    }, [lid])

    const handleFileChange = useCallback((newFile: File | undefined) => {
        setFile(newFile)
        setAiAnalysisResult(null)
        setAiAnalysisError(null)
        setAiFixesAppliedCount(0)
        setPricingIdMapping({})

        if (!newFile) {
            setCsvHeaders([])
            setOriginalCsvFullData([])
            setCsvPreviewData([])
            setCsvFullData([])
            setFieldMapping({})
            setCustomFieldMapping({})
            setNewCustomFields([])
            return
        }

        Papa.parse(newFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = (results.meta.fields || []).filter(h => h)
                const allData = results.data as Record<string, string>[]
                const previewData = allData.slice(0, 10)

                setCsvHeaders(headers)
                setOriginalCsvFullData(allData)
                setCsvPreviewData(previewData)
                setCsvFullData(allData)

                // Auto-map fields that match common patterns
                const autoMapping: Record<string, string> = {}
                const lowerHeaders = headers.map(h => h.toLowerCase())

                const fieldPatterns: Record<string, string[]> = {
                    firstName: ['firstname', 'first_name', 'first name', 'fname'],
                    lastName: ['lastname', 'last_name', 'last name', 'lname'],
                    email: ['email', 'e-mail', 'emailaddress', 'email_address'],
                    phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'cell'],
                    lastRenewalDate: ['lastrenewaldate', 'last_renewal_date', 'renewal_date', 'renewaldate'],
                    classCredits: ['classcredits', 'class_credits', 'credits', 'remaining_credits', 'class credits'],
                    paymentTermsLeft: ['paymenttermsleft', 'payment_terms_left', 'terms_left', 'payments_remaining', 'terms remaining'],
                    backdateStartDate: ['backdate', 'backdate_start', 'backdate_start_date', 'original_start', 'start_date_backdate'],
                    termEndDate: ['term_end_date', 'termenddate', 'end_date', 'plan_end_date', 'membership_end'],
                    pricingPlanId: ['pricing_plan_id', 'pricingplanid', 'plan_id', 'planid', 'pricing_id', 'pricingid', 'pricingoptionid', 'pricing_option_id'],
                }

                for (const [field, patterns] of Object.entries(fieldPatterns)) {
                    const matchIndex = lowerHeaders.findIndex(h => patterns.includes(h))
                    if (matchIndex !== -1) {
                        autoMapping[field] = headers[matchIndex]
                    }
                }

                setFieldMapping(autoMapping)

                const mappedColumns = new Set(Object.values(autoMapping))
                const unmappedHeaders = headers.filter(h => !mappedColumns.has(h))

                const newFields: NewCustomField[] = unmappedHeaders.map(header => {
                    const columnValues = allData.slice(0, 20).map(row => row[header])
                    return {
                        csvColumn: header,
                        fieldName: header.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        fieldType: inferFieldType(columnValues),
                        selected: false,
                        sampleValues: columnValues.filter(v => v?.trim()).slice(0, 3),
                    }
                })

                setNewCustomFields(newFields)
            },
            error: (error) => {
                console.error('CSV parsing error:', error)
            },
        })
    }, [])

    const handleAiAnalysis = useCallback(async () => {
        if (!csvHeaders.length || !csvFullData.length) return
        
        // TODO: WALLET BALANCE CHECK
        // Before calling AI analysis, check if the location has sufficient
        // wallet balance. Show a message if balance is too low.
        
        setIsAiAnalyzing(true)
        setAiAnalysisError(null)
        
        try {
            const result = await analyzeCsvMutation.mutateAsync({
                csvData: csvFullData,
                headers: csvHeaders,
            })
            setAiAnalysisResult(result)
            setAiFixesAppliedCount(0)
            
            // Build pricing ID mapping from AI result
            // Format: { "columnName": { "csvValue": "pricingId" } }
            const newPricingIdMapping: Record<string, Record<string, string>> = {}
            for (const [columnName, matches] of Object.entries(result.pricingMatches)) {
                newPricingIdMapping[columnName] = {}
                for (const match of matches) {
                    newPricingIdMapping[columnName][match.csvValue] = match.pricingId
                }
            }
            setPricingIdMapping(newPricingIdMapping)
            
            // Auto-apply column mappings with >= 75% confidence
            const autoMappings: Record<string, string> = {}
            for (const [csvHeader, mapping] of Object.entries(result.columnMapping)) {
                if (mapping.suggestedField && mapping.confidence >= 0.75) {
                    autoMappings[mapping.suggestedField] = csvHeader
                }
            }
            if (Object.keys(autoMappings).length > 0) {
                setFieldMapping(prev => ({ ...prev, ...autoMappings }))
            }
        } catch (error) {
            console.error('AI analysis error:', error)
            setAiAnalysisError(error instanceof Error ? error.message : 'Failed to analyze CSV')
        } finally {
            setIsAiAnalyzing(false)
        }
    }, [csvHeaders, csvFullData, analyzeCsvMutation])

    const resolveIssueRowIndex = useCallback((issueRowIndex: number) => {
        if (issueRowIndex >= 0 && issueRowIndex < csvFullData.length) {
            return issueRowIndex
        }

        const oneBasedIndex = issueRowIndex - 1
        if (oneBasedIndex >= 0 && oneBasedIndex < csvFullData.length) {
            return oneBasedIndex
        }

        return -1
    }, [csvFullData.length])

    const normalizeValue = useCallback((value: unknown) => String(value ?? '').trim(), [])

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
        return [
            'format',
            'change',
            'convert',
            'remove',
            'should',
            'ensure',
            'use ',
            'example',
            'e.g.',
        ].some(token => lower.includes(token))
    }, [])

    const getConcreteSuggestedValue = useCallback((columnName: string, suggestedFixRaw: string, currentValueRaw?: unknown) => {
        const suggestedFix = suggestedFixRaw.trim().replace(/^"|"$/g, '')
        const currentValue = normalizeValue(currentValueRaw)

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

        if (looksLikeInstruction(suggestedFix)) {
            return null
        }

        return suggestedFix
    }, [getMappedFieldForColumn, looksLikeInstruction, normalizeValue])

    const getPendingAiFixCount = useCallback(() => {
        if (!aiAnalysisResult?.valueIssues) return 0

        let pending = 0
        for (const [columnName, issues] of Object.entries(aiAnalysisResult.valueIssues)) {
            for (const issue of issues) {
                const resolvedRowIndex = resolveIssueRowIndex(issue.rowIndex)
                if (resolvedRowIndex === -1) continue

                const row = csvFullData[resolvedRowIndex]
                if (!row) continue

                const currentValue = row[columnName]
                const originalRowValue = originalCsvFullData[resolvedRowIndex]?.[columnName]
                const suggestedFix = getConcreteSuggestedValue(columnName, issue.suggestedFix || '', currentValue)
                if (!suggestedFix) continue

                const isSameAsIssue = normalizeLoose(currentValue) === normalizeLoose(issue.originalValue)
                const isSameAsOriginalRow = normalizeLoose(currentValue) === normalizeLoose(originalRowValue)

                if ((isSameAsIssue || isSameAsOriginalRow) && normalizeLoose(currentValue) !== normalizeLoose(suggestedFix)) {
                    pending += 1
                }
            }
        }

        return pending
    }, [aiAnalysisResult, csvFullData, originalCsvFullData, resolveIssueRowIndex, normalizeLoose, getConcreteSuggestedValue])

    const handleApplyAiFixes = useCallback(() => {
        if (!aiAnalysisResult?.valueIssues) return

        const nextData = csvFullData.map(row => ({ ...row }))
        let appliedCount = 0

        for (const [columnName, issues] of Object.entries(aiAnalysisResult.valueIssues)) {
            for (const issue of issues) {
                const resolvedRowIndex = resolveIssueRowIndex(issue.rowIndex)
                if (resolvedRowIndex === -1) continue

                const row = nextData[resolvedRowIndex]
                if (!row) continue

                const currentValue = row[columnName]
                const originalRowValue = originalCsvFullData[resolvedRowIndex]?.[columnName]
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
            setCsvFullData(nextData)
            setCsvPreviewData(nextData.slice(0, 10))
            setAiFixesAppliedCount(prev => prev + appliedCount)
        }
    }, [aiAnalysisResult, csvFullData, originalCsvFullData, resolveIssueRowIndex, normalizeLoose, getConcreteSuggestedValue])

    const handleSourceSelect = useCallback((source: ImportSource) => {
        setImportSource(source)
        if (source !== 'csv') {
            setFile(undefined)
            setCsvHeaders([])
            setOriginalCsvFullData([])
            setCsvPreviewData([])
            setCsvFullData([])
            setFieldMapping({})
            setCustomFieldMapping({})
            setNewCustomFields([])
            setAiAnalysisResult(null)
            setAiAnalysisError(null)
            setAiFixesAppliedCount(0)
            setPricingIdMapping({})
        }
    }, [])

    // Compute unmapped columns (excluding required mappings and custom field mappings)
    const getMappedColumns = useCallback(() => {
        const mapped = new Set<string>()
        Object.values(fieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        Object.values(customFieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        return mapped
    }, [fieldMapping, customFieldMapping])

    // Update newCustomFields when mappings change
    useEffect(() => {
        if (csvHeaders.length === 0) return

        const mappedColumns = getMappedColumns()
        const unmappedHeaders = csvHeaders.filter(h => !mappedColumns.has(h))

        setNewCustomFields(prev => {
            // Keep existing selections for columns that are still unmapped
            const existingByColumn = new Map(prev.map(f => [f.csvColumn, f]))

            return unmappedHeaders.map(header => {
                const existing = existingByColumn.get(header)
                if (existing) return existing

                const columnValues = csvFullData.slice(0, 20).map(row => row[header])
                return {
                    csvColumn: header,
                    fieldName: header.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    fieldType: inferFieldType(columnValues),
                    selected: false,
                    sampleValues: columnValues.filter(v => v?.trim()).slice(0, 3),
                }
            })
        })
    }, [csvHeaders, csvFullData, getMappedColumns])

    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'lastRenewalDate']
    const isStep1Valid = importSource === 'csv' && file && csvHeaders.length > 0
    const isStep2Valid = requiredFields.every(field => fieldMapping[field])

    return (
        <div className='flex flex-col h-[calc(100vh-200px)] relative'>
            {/* AI Analysis Loading Overlay */}
            {isAiAnalyzing && (
                <div className='absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm'>
                    <div className='flex flex-col items-center gap-4 rounded-lg border border-foreground/10 bg-background/95 p-8 shadow-xl'>
                        <div className='relative'>
                            <Loader2 className='size-10 animate-spin text-foreground' />
                        </div>
                        <div className='text-center'>
                            <p className='text-sm font-medium'>Analyzing your CSV</p>
                            <p className='mt-1 text-xs text-muted-foreground'>
                                AI is mapping columns and detecting data patterns...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <InteractiveStepper
                ref={stepperRef}
                defaultValue={1}
                orientation='horizontal'
                className='flex-1 overflow-y-auto py-1'
            >
                <InteractiveStepperItem key="step-1">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Select Source</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key="step-2">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Map Fields</InteractiveStepperTitle>
                    <InteractiveStepperSeparator />
                </InteractiveStepperItem>

                <InteractiveStepperItem key="step-3">
                    <InteractiveStepperIndicator />
                    <InteractiveStepperTitle>Preview & Import</InteractiveStepperTitle>
                </InteractiveStepperItem>

                <InteractiveStepperContent step={1} className='overflow-auto'>
                    <SelectSourceStep
                        importSource={importSource}
                        onSourceSelect={handleSourceSelect}
                        file={file}
                        onFileChange={handleFileChange}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={2} className='overflow-auto'>
                    <MapFieldsStep
                        headers={csvHeaders}
                        fieldMapping={fieldMapping}
                        setFieldMapping={setFieldMapping}
                        existingCustomFields={existingCustomFields}
                        customFieldMapping={customFieldMapping}
                        setCustomFieldMapping={setCustomFieldMapping}
                        newCustomFields={newCustomFields}
                        setNewCustomFields={setNewCustomFields}
                        isLoadingCustomFields={isLoadingCustomFields}
                        previewData={csvPreviewData}
                        includeCustomFields={includeCustomFields}
                        setIncludeCustomFields={setIncludeCustomFields}
                        aiAnalysisResult={aiAnalysisResult}
                        aiAnalysisError={aiAnalysisError}
                        isAiAnalyzing={isAiAnalyzing}
                        onAiAnalyze={handleAiAnalysis}
                        onApplyAiFixes={handleApplyAiFixes}
                        aiFixesPendingCount={getPendingAiFixCount()}
                        aiFixesAppliedCount={aiFixesAppliedCount}
                    />
                </InteractiveStepperContent>

                <InteractiveStepperContent step={3} className='overflow-auto'>
                    <PreviewStep
                        lid={lid}
                        file={file}
                        previewData={csvPreviewData}
                        fullData={csvFullData}
                        fieldMapping={fieldMapping}
                        customFieldMapping={customFieldMapping}
                        existingCustomFields={existingCustomFields}
                        newCustomFields={newCustomFields}
                        isImporting={isImporting}
                        setIsImporting={setIsImporting}
                        includeCustomFields={includeCustomFields}
                        pricingIdMapping={pricingIdMapping}
                    />
                </InteractiveStepperContent>
            </InteractiveStepper>

            <StepperFooter
                stepperRef={stepperRef}
                isStep1Valid={isStep1Valid}
                isStep2Valid={isStep2Valid}
                isImporting={isImporting}
            />
        </div>
    )
}
