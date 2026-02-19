'use client'

import { Dispatch, SetStateAction } from 'react'
import { CheckCircle2, AlertCircle, Loader2, HelpCircle, Sparkles, Wand2 } from 'lucide-react'
import { Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { cn } from '@/libs/utils'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'
import { UnmappedColumnsSection } from './UnmappedColumnsSection'
import type { CustomFieldDefinition } from '@/types/member'
import type { NewCustomField } from './ImportStepperPage'
import type { MigrationAnalysisResult } from '@/hooks/useMigrations'

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

const requiredFields = [
    { key: 'firstName', label: 'First Name', description: 'Member\'s first name' },
    { key: 'lastName', label: 'Last Name', description: 'Member\'s last name' },
    { key: 'email', label: 'Email', description: 'Member\'s email address' },
    { key: 'phone', label: 'Phone', description: 'Member\'s phone number' },
    { key: 'lastRenewalDate', label: 'Last Renewal Date', description: 'Date of last membership renewal (YYYY-MM-DD)' },
]

const optionalFields = [
    {
        key: 'pricingPlanId',
        label: 'Pricing Plan ID',
        description: 'Auto-assign members to pricing options via CSV values (advanced)',
        tooltip: 'When mapped, each member will be automatically assigned to the pricing option specified in this column. This disables manual plan selection in the next step. Values should be valid pricing option IDs from your existing plans.'
    },
    { key: 'classCredits', label: 'Class Credits', description: 'Number of class credits (optional)' },
    {
        key: 'paymentTermsLeft',
        label: 'Payment Terms Left',
        description: 'Remaining payment terms (optional)',
        tooltip: 'If Term End Date is also provided, it will take precedence over this value'
    },
    { key: 'backdateStartDate', label: 'Backdate Start Date', description: 'Original start date for backdating (YYYY-MM-DD, optional)' },
    {
        key: 'termEndDate',
        label: 'Term End Date',
        description: 'End date of current plan term (YYYY-MM-DD, optional)',
        tooltip: 'If provided, this will override the Payment Terms Left value'
    },
]

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
    const requiredMappedCount = requiredFields.filter(field => fieldMapping[field.key]).length
    const customMappedCount = existingCustomFields.filter(field => customFieldMapping[field.id]).length
    const optionalMappedCount = optionalFields.filter(field => fieldMapping[field.key]).length

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
            {/* AI Analysis Section */}
            <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <Sparkles className='size-4 text-primary' />
                        <span className='text-sm font-medium'>AI Column Mapping</span>
                    </div>
                    {aiAnalysisResult && (
                        <Badge variant='outline' className='text-xs'>
                            {Object.keys(aiAnalysisResult.columnMapping).length} suggestions
                        </Badge>
                    )}
                </div>
                
                {!aiAnalysisResult && !aiAnalysisError && (
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={onAiAnalyze}
                            disabled={isAiAnalyzing || !headers.length}
                            className='gap-2 dark:border-foreground/20 bg-card text-foreground hover:bg-accent/60'
                        >
                            {isAiAnalyzing ? (
                                <>
                                    <Loader2 className='size-4 animate-spin' />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className='size-4' />
                                    Analyze with AI
                                </>
                            )}
                        </Button>
                        <span className='text-xs text-muted-foreground'>
                            Let AI suggest column mappings
                        </span>
                    </div>
                )}

                {aiAnalysisError && (
                    <div className='flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20'>
                        <AlertCircle className='size-4 text-destructive mt-0.5 flex-shrink-0' />
                        <div className='flex-1'>
                            <p className='text-sm text-destructive'>{aiAnalysisError}</p>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onAiAnalyze}
                                className='mt-2 h-7 text-xs'
                            >
                                Try again
                            </Button>
                        </div>
                    </div>
                )}

                {aiAnalysisResult && (
                    <div className='flex items-start gap-2 p-3 rounded-lg border border-foreground/10 bg-muted/40'>
                        <CheckCircle2 className='size-4 text-emerald-500 mt-0.5 flex-shrink-0' />
                        <div className='flex-1'>
                            <p className='text-sm'>AI analysis complete</p>
                            <p className='text-xs text-muted-foreground mt-0.5'>
                                {Object.values(aiAnalysisResult.columnMapping).filter(m => m.confidence >= 0.7).length} high-confidence suggestions
                            </p>
                        </div>
                        <Button
                            variant='secondary'
                            size='sm'
                            onClick={applyAiSuggestions}
                            className='h-7 text-xs'
                        >
                            Apply suggestions
                        </Button>
                    </div>
                )}
            </div>

            {aiAnalysisResult && aiIssuesCount > 0 && (
                <div className='rounded-lg border border-amber-500/20 bg-amber-500/5 p-4'>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <div className='text-sm font-medium text-amber-600'>AI Data Quality</div>
                            <p className='mt-1 text-xs text-amber-600/80'>
                                {aiIssuesCount} issue{aiIssuesCount > 1 ? 's' : ''} across {aiIssueColumnsCount} column{aiIssueColumnsCount > 1 ? 's' : ''}
                            </p>
                        </div>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={onApplyAiFixes}
                            disabled={!onApplyAiFixes || aiFixesPendingCount === 0}
                            className='h-7 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10 disabled:opacity-60'
                        >
                            Apply AI fixes
                        </Button>
                    </div>

                    <div className='mt-3 space-y-1.5'>
                        {aiIssueExamples.map((issue) => (
                            <div key={`${issue.columnName}-${issue.rowIndex}-${issue.originalValue}`} className='text-xs text-muted-foreground'>
                                <span className='font-medium text-foreground'>{issue.columnName}</span>{' '}
                                (row {issue.rowIndex + 1}): "{issue.originalValue}" {'->'} "{issue.suggestedFix}"
                            </div>
                        ))}
                    </div>

                    {aiFixesAppliedCount > 0 && (
                        <p className='mt-3 text-xs text-emerald-600'>
                            {aiFixesAppliedCount} AI fix{aiFixesAppliedCount > 1 ? 'es' : ''} applied to your data.
                        </p>
                    )}
                </div>
            )}

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
                        requiredMappedCount === requiredFields.length
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-foreground/5 text-muted-foreground'
                    )}>
                        {requiredMappedCount}/{requiredFields.length} mapped
                    </div>
                </div>

                <div className='space-y-2'>
                    {requiredFields.map((field) => {
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
                        {optionalMappedCount}/{optionalFields.length} mapped
                    </div>
                </div>

                <div className='space-y-2'>
                    {optionalFields.map((field) => {
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
