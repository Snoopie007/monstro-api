'use client'

import { Dispatch, SetStateAction } from 'react'
import { CheckCircle2, AlertCircle, HelpCircle, Sparkles, Loader2 } from 'lucide-react'
import { Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { cn } from '@/libs/utils'
import { Badge } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'
import { UnmappedColumnsSection } from './UnmappedColumnsSection'
import { AiMappingPanel } from './AiMappingPanel'
import { AiDataQualityPanel } from './AiDataQualityPanel'
import type { CustomFieldDefinition } from '@/types/member'
import type { NewCustomField } from '@/types/migration'
import type { MigrationAnalysisResult } from '@/hooks/useMigrations'
import { REQUIRED_FIELDS, OPTIONAL_FIELDS } from '@/constants/migration'

interface MapFieldsStepProps {
    headers: string[]
    fieldMapping: Record<string, string>
    setFieldMapping: Dispatch<SetStateAction<Record<string, string>>>
    existingCustomFields: CustomFieldDefinition[]
    customFieldMapping: Record<string, string>
    setCustomFieldMapping: Dispatch<SetStateAction<Record<string, string>>>
    newCustomFields: NewCustomField[]
    setNewCustomFields: Dispatch<SetStateAction<NewCustomField[]>>
    isLoadingCustomFields: boolean
    previewData: Record<string, string>[]
    includeCustomFields: boolean
    setIncludeCustomFields: Dispatch<SetStateAction<boolean>>
    aiAnalysisResult?: MigrationAnalysisResult | null
    aiAnalysisError?: string | null
    isAiAnalyzing?: boolean
    onAiAnalyze?: () => Promise<void>
    onApplyAiFixes?: () => void
    aiFixesPendingCount?: number
    aiFixesAppliedCount?: number
}



export function MapFieldsStep({
    headers,
    fieldMapping,
    setFieldMapping,
    existingCustomFields,
    customFieldMapping,
    setCustomFieldMapping,
    newCustomFields,
    setNewCustomFields,
    isLoadingCustomFields,
    previewData,
    includeCustomFields,
    setIncludeCustomFields,
    aiAnalysisResult,
    aiAnalysisError,
    isAiAnalyzing,
    onAiAnalyze,
    onApplyAiFixes,
    aiFixesPendingCount = 0,
    aiFixesAppliedCount = 0,
}: MapFieldsStepProps) {
    const requiredMappedCount = REQUIRED_FIELDS.filter(field => fieldMapping[field.key]).length
    const customMappedCount = existingCustomFields.filter(field => customFieldMapping[field.id]).length
    const optionalMappedCount = OPTIONAL_FIELDS.filter(field => fieldMapping[field.key]).length

    const getMappedColumns = () => {
        const mapped = new Set<string>()
        Object.values(fieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        Object.values(customFieldMapping).forEach(col => {
            if (col) mapped.add(col)
        })
        return mapped
    }

    const mappedColumns = getMappedColumns()

    const getAvailableHeaders = (currentValue: string | undefined) => {
        return headers.filter(h => h && (h === currentValue || !mappedColumns.has(h)))
    }

    const applyAiSuggestions = () => {
        if (!aiAnalysisResult?.columnMapping) return
        
        const newMapping: Record<string, string> = { ...fieldMapping }
        
        for (const [csvHeader, mapping] of Object.entries(aiAnalysisResult.columnMapping)) {
            if (mapping.suggestedField && mapping.confidence >= 0.7) {
                const existingMapping = Object.entries(newMapping).find(([, col]) => col === csvHeader)
                if (existingMapping) {
                    delete newMapping[existingMapping[0]]
                }
                newMapping[mapping.suggestedField] = csvHeader
            }
        }
        
        setFieldMapping(newMapping)
    }

    const getAiSuggestionForField = (fieldKey: string): { csvHeader: string; confidence: number; reasoning: string } | null => {
        if (!aiAnalysisResult?.columnMapping) return null
        
        for (const [csvHeader, mapping] of Object.entries(aiAnalysisResult.columnMapping)) {
            if (mapping.suggestedField === fieldKey) {
                return {
                    csvHeader,
                    confidence: mapping.confidence,
                    reasoning: mapping.reasoning,
                }
            }
        }
        return null
    }

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'text-green-500'
        if (confidence >= 0.7) return 'text-yellow-500'
        return 'text-orange-500'
    }

    const valueIssueEntries = Object.entries(aiAnalysisResult?.valueIssues || {})
    const aiIssuesCount = valueIssueEntries.reduce((sum, [, issues]) => sum + issues.length, 0)
    const aiIssueColumnsCount = valueIssueEntries.filter(([, issues]) => issues.length > 0).length
    const aiIssueExamples = valueIssueEntries
        .flatMap(([columnName, issues]) => issues.map(issue => ({ columnName, ...issue })))
        .slice(0, 3)

    return (
        <div className='space-y-8'>
            <AiMappingPanel
                headersCount={headers.length}
                aiAnalysisResult={aiAnalysisResult}
                aiAnalysisError={aiAnalysisError}
                isAiAnalyzing={isAiAnalyzing}
                onAiAnalyze={onAiAnalyze}
                onApplySuggestions={applyAiSuggestions}
                highConfidenceCount={Object.values(aiAnalysisResult?.columnMapping || {}).filter(m => m.confidence >= 0.7).length}
            />

            <AiDataQualityPanel
                aiIssuesCount={aiIssuesCount}
                aiIssueColumnsCount={aiIssueColumnsCount}
                aiIssueExamples={aiIssueExamples}
                aiFixesPendingCount={aiFixesPendingCount}
                aiFixesAppliedCount={aiFixesAppliedCount}
                onApplyAiFixes={onApplyAiFixes}
            />

            {/* Required Fields Section */}
            <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                    <div>
                        <div className='text-sm font-medium'>Required Fields</div>
                        <div className='text-xs text-muted-foreground mt-1'>
                            These fields are required for all members
                        </div>
                    </div>
                    <div className={cn(
                        'text-sm font-medium px-3 py-1 rounded-full',
                        requiredMappedCount === REQUIRED_FIELDS.length
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-foreground/5 text-muted-foreground'
                    )}>
                        {requiredMappedCount}/{REQUIRED_FIELDS.length} mapped
                    </div>
                </div>

                <div className='space-y-2'>
                    {REQUIRED_FIELDS.map((field) => {
                        const isMapped = !!fieldMapping[field.key]
                        const availableHeaders = getAvailableHeaders(fieldMapping[field.key])
                        const aiSuggestion = getAiSuggestionForField(field.key)

                        return (
                            <div
                                key={field.key}
                                className={cn(
                                    'flex flex-row items-center gap-4 p-3 rounded-lg border transition-colors',
                                    isMapped
                                        ? 'border-green-500/30 bg-green-500/5'
                                        : 'border-foreground/10 bg-foreground/5'
                                )}
                            >
                                <div className='flex-shrink-0'>
                                    {isMapped ? (
                                        <CheckCircle2 className='size-5 text-green-500' />
                                    ) : (
                                        <AlertCircle className='size-5 text-muted-foreground' />
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <div className='text-sm font-medium flex items-center gap-2'>
                                        {field.label}
                                        <Badge variant='destructive' className='text-[10px] px-1.5 py-0'>Required</Badge>
                                    </div>
                                    <div className='text-xs text-muted-foreground'>{field.description}</div>
                                    {aiSuggestion && !isMapped && (
                                        <div className='flex items-center gap-1.5 mt-1'>
                                            <Sparkles className={cn('size-3', getConfidenceColor(aiSuggestion.confidence))} />
                                            <span className='text-xs text-muted-foreground'>
                                                AI suggests: <span className='font-medium'>{aiSuggestion.csvHeader}</span>
                                            </span>
                                            <Badge variant='outline' className='text-[10px] h-4 px-1'>
                                                {Math.round(aiSuggestion.confidence * 100)}%
                                            </Badge>
                                        </div>
                                    )}
                                    {aiSuggestion && isMapped && fieldMapping[field.key] === aiSuggestion.csvHeader && (
                                        <div className='flex items-center gap-1.5 mt-1'>
                                            <Sparkles className='size-3 text-emerald-500' />
                                            <span className='text-xs text-muted-foreground'>
                                                AI mapped this column
                                            </span>
                                            <Badge variant='outline' className='text-[10px] h-4 px-1 text-muted-foreground border-border'>
                                                {Math.round(aiSuggestion.confidence * 100)}% confidence
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <div className='flex-1 max-w-[200px]'>
                                    <Select
                                        value={fieldMapping[field.key] || ''}
                                        onValueChange={(value) => {
                                            setFieldMapping(prev => ({ ...prev, [field.key]: value }))
                                        }}
                                    >
                                        <SelectTrigger className='border-foreground/10 h-9 text-sm'>
                                            <SelectValue placeholder='Select column' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableHeaders.map((header) => (
                                                <SelectItem key={header} value={header}>
                                                    {header}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Optional Fields Section */}
            <div className='space-y-4 pt-4 border-t border-foreground/10'>
                <div className='flex items-center justify-between'>
                    <div>
                        <div className='text-sm font-medium'>Optional Fields</div>
                        <div className='text-xs text-muted-foreground mt-1'>
                            Additional data you can import for members
                        </div>
                    </div>
                    <div className={cn(
                        'text-sm font-medium px-3 py-1 rounded-full',
                        optionalMappedCount > 0
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-foreground/5 text-muted-foreground'
                    )}>
                        {optionalMappedCount}/{OPTIONAL_FIELDS.length} mapped
                    </div>
                </div>

                <div className='space-y-2'>
                    {OPTIONAL_FIELDS.map((field) => {
                        const isMapped = !!fieldMapping[field.key]
                        const availableHeaders = getAvailableHeaders(fieldMapping[field.key])
                        const aiSuggestion = getAiSuggestionForField(field.key)

                        return (
                            <div
                                key={field.key}
                                className={cn(
                                    'flex flex-row items-center gap-4 p-3 rounded-lg border transition-colors',
                                    isMapped
                                        ? 'border-blue-500/30 bg-blue-500/5'
                                        : 'border-foreground/10 bg-foreground/5'
                                )}
                            >
                                <div className='flex-shrink-0'>
                                    {isMapped ? (
                                        <CheckCircle2 className='size-5 text-blue-500' />
                                    ) : (
                                        <div className='size-5 rounded-full border-2 border-foreground/20' />
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <div className='text-sm font-medium flex items-center gap-2'>
                                        {field.label}
                                        <Badge variant='outline' className='text-[10px] px-1.5 py-0 text-muted-foreground'>Optional</Badge>
                                        {(field as { tooltip?: string }).tooltip && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className='size-3.5 text-muted-foreground cursor-help' />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className='max-w-xs'>{(field as { tooltip?: string }).tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>{field.description}</div>
                                    {aiSuggestion && !isMapped && (
                                        <div className='flex items-center gap-1.5 mt-1'>
                                            <Sparkles className={cn('size-3', getConfidenceColor(aiSuggestion.confidence))} />
                                            <span className='text-xs text-muted-foreground'>
                                                AI suggests: <span className='font-medium'>{aiSuggestion.csvHeader}</span>
                                            </span>
                                            <Badge variant='outline' className='text-[10px] h-4 px-1'>
                                                {Math.round(aiSuggestion.confidence * 100)}%
                                            </Badge>
                                        </div>
                                    )}
                                    {aiSuggestion && isMapped && fieldMapping[field.key] === aiSuggestion.csvHeader && (
                                        <div className='flex items-center gap-1.5 mt-1'>
                                            <Sparkles className='size-3 text-emerald-500' />
                                            <span className='text-xs text-muted-foreground'>
                                                AI mapped this column
                                            </span>
                                            <Badge variant='outline' className='text-[10px] h-4 px-1 text-muted-foreground border-border'>
                                                {Math.round(aiSuggestion.confidence * 100)}% confidence
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <div className='flex-1 max-w-[200px]'>
                                    <Select
                                        value={fieldMapping[field.key] || ''}
                                        onValueChange={(value) => {
                                            setFieldMapping(prev => ({ ...prev, [field.key]: value }))
                                        }}
                                    >
                                        <SelectTrigger className='border-foreground/10 h-9 text-sm'>
                                            <SelectValue placeholder='Select column' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableHeaders.map((header) => (
                                                <SelectItem key={header} value={header}>
                                                    {header}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Custom Fields Toggle */}
            <div className='flex items-center gap-3 pt-4 border-t border-foreground/10'>
                <Checkbox
                    id='include-custom-fields'
                    checked={includeCustomFields}
                    onCheckedChange={(checked) => setIncludeCustomFields(checked === true)}
                />
                <label
                    htmlFor='include-custom-fields'
                    className='text-sm font-medium cursor-pointer'
                >
                    Include and map custom fields
                </label>
            </div>

            {/* Existing Custom Fields Section */}
            {includeCustomFields && isLoadingCustomFields ? (
                <div className='flex items-center justify-center py-8 text-muted-foreground'>
                    <Loader2 className='size-4 animate-spin mr-2' />
                    Loading custom fields...
                </div>
            ) : includeCustomFields && existingCustomFields.length > 0 ? (
                <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <div className='text-sm font-medium'>Custom Fields</div>
                            <div className='text-xs text-muted-foreground mt-1'>
                                Map CSV columns to your existing custom fields
                            </div>
                        </div>
                        {customMappedCount > 0 ? (
                            <div className='text-sm font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-600'>
                                {customMappedCount}/{existingCustomFields.length} mapped
                            </div>
                        ) : null}
                    </div>

                    <div className='space-y-2'>
                        {existingCustomFields.map((field) => {
                            const isMapped = !!customFieldMapping[field.id]
                            const availableHeaders = getAvailableHeaders(customFieldMapping[field.id])

                            return (
                                <div
                                    key={field.id}
                                    className={cn(
                                        'flex flex-row items-center gap-4 p-3 rounded-lg border transition-colors',
                                        isMapped
                                            ? 'border-blue-500/30 bg-blue-500/5'
                                            : 'border-foreground/10 bg-foreground/5'
                                    )}
                                >
                                    <div className='flex-shrink-0'>
                                        {isMapped ? (
                                            <CheckCircle2 className='size-5 text-blue-500' />
                                        ) : (
                                            <div className='size-5 rounded-full border-2 border-foreground/20' />
                                        )}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='text-sm font-medium flex items-center gap-2'>
                                            {field.name}
                                            <Badge variant='secondary' className='text-[10px] px-1.5 py-0 capitalize'>
                                                {field.type}
                                            </Badge>
                                            {field.required ? (
                                                <Badge variant='destructive' className='text-[10px] px-1.5 py-0'>Required</Badge>
                                            ) : (
                                                <Badge variant='outline' className='text-[10px] px-1.5 py-0 text-muted-foreground'>Optional</Badge>
                                            )}
                                        </div>
                                        {field.helpText ? (
                                            <div className='text-xs text-muted-foreground'>{field.helpText}</div>
                                        ) : null}
                                    </div>
                                    <div className='flex-1 max-w-[200px]'>
                                        <Select
                                            value={customFieldMapping[field.id] || '__none__'}
                                            onValueChange={(value) => {
                                                setCustomFieldMapping(prev => ({
                                                    ...prev,
                                                    [field.id]: value === '__none__' ? '' : value
                                                }))
                                            }}
                                        >
                                            <SelectTrigger className='border-foreground/10 h-9 text-sm'>
                                                <SelectValue placeholder='Select column' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value='__none__'>None</SelectItem>
                                                {availableHeaders.map((header) => (
                                                    <SelectItem key={header} value={header}>
                                                        {header}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}

            {/* Unmapped Columns Section */}
            {includeCustomFields && newCustomFields.length > 0 ? (
                <UnmappedColumnsSection
                    newCustomFields={newCustomFields}
                    setNewCustomFields={setNewCustomFields}
                    previewData={previewData}
                />
            ) : null}

            {/* Detected columns info */}
            {headers.length > 0 ? (
                <div className='text-xs text-muted-foreground pt-4 border-t border-foreground/10'>
                    <span className='font-medium'>Detected {headers.length} columns:</span>{' '}
                    {headers.join(', ')}
                </div>
            ) : null}
        </div>
    )
}
