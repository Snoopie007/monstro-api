'use client'

import { Dispatch, SetStateAction, useState, useMemo, useEffect } from 'react'
import { Loader2, Users, FileSpreadsheet, CheckCircle2, Plus, Layers, ChevronDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/libs/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { Label, Switch } from '@/components/forms'
import { Badge } from '@/components/ui'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/ToolTip'
import { toast } from 'react-toastify'
import { tryCatch, formatAmountForDisplay } from '@/libs/utils'
import { useMemberPlans } from '@/hooks'
import { validateImportData } from '@/libs/validation/importValidation'
import type { MemberPlan, MemberPlanPricing, CustomFieldDefinition } from '@subtrees/types'
import type { NewCustomField } from './ImportStepperPage'

interface PreviewStepProps {
    lid: string
    file: File | undefined
    previewData: Record<string, string>[]
    fullData: Record<string, string>[]
    fieldMapping: Record<string, string>
    customFieldMapping: Record<string, string>
    existingCustomFields: CustomFieldDefinition[]
    newCustomFields: NewCustomField[]
    isImporting: boolean
    setIsImporting: Dispatch<SetStateAction<boolean>>
    includeCustomFields: boolean
}

const displayFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'lastRenewalDate', label: 'Renewal Date' },
    // Optional fields (shown only when mapped)
    { key: 'classCredits', label: 'Credits', optional: true },
    { key: 'paymentTermsLeft', label: 'Terms', optional: true },
    { key: 'backdateStartDate', label: 'Backdate', optional: true },
    { key: 'termEndDate', label: 'Term End', optional: true },
    { key: 'pricingPlanId', label: 'Plan ID', optional: true },
]

export function PreviewStep({
    lid,
    file,
    previewData,
    fullData,
    fieldMapping,
    customFieldMapping,
    existingCustomFields,
    newCustomFields,
    isImporting,
    setIsImporting,
    includeCustomFields,
}: PreviewStepProps) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
    const [pricingId, setPricingId] = useState<string | null>(null)
    const [requirePayment, setRequirePayment] = useState(false)
    const [importSuccess, setImportSuccess] = useState(false)
    const [expandedAccordion, setExpandedAccordion] = useState<number | null>(null)
    const { plans, isLoading: isLoadingPlans } = useMemberPlans(lid)

    // Validation
    const validationResult = useMemo(() => {
        return validateImportData(fullData, {
            fieldMapping,
            customFieldMapping,
            customFields: [
                ...existingCustomFields.map(f => ({ key: f.id, type: f.type })),
                ...newCustomFields.filter(f => f.selected).map(f => ({ key: f.csvColumn, type: f.fieldType }))
            ],
            plans: plans || [],
            isLoadingPlans
        })
    }, [fullData, fieldMapping, customFieldMapping, existingCustomFields, newCustomFields, plans, isLoadingPlans])

    const { totalRows, validRows, invalidRows, errorsByRow } = validationResult

    // Derived state for selected plan and pricing options
    const selectedPlan = useMemo(() => {
        return plans?.find((p: MemberPlan) => p.id === selectedPlanId)
    }, [plans, selectedPlanId])

    const pricingOptions = selectedPlan?.pricingOptions || []

    // Reset pricing when plan changes
    useEffect(() => {
        setPricingId(null)
    }, [selectedPlanId])

    const getMappedValue = (row: Record<string, string>, fieldKey: string) => {
        const csvColumn = fieldMapping[fieldKey]
        return csvColumn ? row[csvColumn] || '-' : '-'
    }

    const getCustomFieldValue = (row: Record<string, string>, fieldId: string) => {
        const csvColumn = customFieldMapping[fieldId]
        return csvColumn ? row[csvColumn] || '-' : '-'
    }

    // Get mapped existing custom fields (only when includeCustomFields is enabled)
    const mappedExistingFields = includeCustomFields
        ? existingCustomFields.filter(f => customFieldMapping[f.id])
        : []

    // Get selected new custom fields (only when includeCustomFields is enabled)
    const selectedNewFields = includeCustomFields
        ? newCustomFields.filter(f => f.selected)
        : []

    // Count total custom fields
    const totalCustomFieldsCount = mappedExistingFields.length + selectedNewFields.length

    async function handleImport() {
        if (!file) {
            toast.error('No file selected')
            return
        }

        setIsImporting(true)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('fieldMapping', JSON.stringify(fieldMapping))
        // Only pass pricingId when pricingPlanId is NOT mapped (per-row assignment)
        if (pricingId && !fieldMapping.pricingPlanId) {
            formData.append('pricingId', pricingId)
        }
        if (selectedPlan?.type && !fieldMapping.pricingPlanId) {
            formData.append('planType', selectedPlan.type)
        }
        formData.append('requirePayment', requirePayment.toString())

        // Only send custom field data if toggle is enabled
        if (includeCustomFields) {
            // Add custom field mappings
            if (Object.keys(customFieldMapping).length > 0) {
                formData.append('customFieldMapping', JSON.stringify(customFieldMapping))
            }

            // Add new custom fields to create
            if (selectedNewFields.length > 0) {
                formData.append('newCustomFields', JSON.stringify(
                    selectedNewFields.map(f => ({
                        csvColumn: f.csvColumn,
                        fieldName: f.fieldName,
                        fieldType: f.fieldType,
                    }))
                ))
            }
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/import`, {
                method: 'POST',
                body: formData,
            })
        )

        if (error || !result || !result.ok) {
            const data = await result?.json()
            setIsImporting(false)
            toast.error(data?.message || 'Something went wrong, please try again later')
            return
        }

        setIsImporting(false)
        setImportSuccess(true)
        toast.success('Members imported successfully!')
    }

    if (importSuccess) {
        return (
            <div className='flex flex-col items-center justify-center py-12 space-y-4'>
                <div className='size-16 rounded-full bg-green-500/10 flex items-center justify-center'>
                    <CheckCircle2 className='size-8 text-green-500' />
                </div>
                <div className='text-center space-y-2'>
                    <h3 className='text-lg font-semibold'>Import Successful!</h3>
                    <p className='text-sm text-muted-foreground'>
                        {fullData.length} members have been imported and will receive invitation emails.
                    </p>
                </div>
                <Button
                    variant='primary'
                    onClick={() => {
                        window.location.href = `/dashboard/location/${lid}/migration`
                    }}
                >
                    View Members
                </Button>
            </div>
        )
    }

    if (isImporting) {
        return (
            <div className='flex flex-col items-center justify-center py-12 space-y-4'>
                <Loader2 className='size-8 animate-spin text-primary' />
                <div className='text-center space-y-1'>
                    <p className='text-sm font-medium'>Importing members...</p>
                    <p className='text-xs text-muted-foreground'>
                        This may take a few moments
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='space-y-6'>
            {/* Validation Warning */}
            {invalidRows > 0 && (
                <div className='p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-3'>
                    <AlertCircle className='size-5 text-amber-600 flex-shrink-0 mt-0.5' />
                    <div>
                        <div className='text-sm font-medium text-amber-600'>{invalidRows} row{invalidRows > 1 ? 's' : ''} will be skipped</div>
                        <p className='text-xs text-amber-600/70 mt-1'>These rows contain invalid data and will not be imported</p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className={cn('grid gap-4', includeCustomFields ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
                <div className='flex items-center gap-3 p-4 rounded-lg bg-foreground/5 border border-foreground/10'>
                    <div className='size-10 rounded-full bg-primary/10 flex items-center justify-center'>
                        <Users className='size-5 text-primary' />
                    </div>
                    <div>
                        <div className='text-2xl font-semibold'>{totalRows}</div>
                        <div className='text-xs text-muted-foreground'>Total Rows</div>
                    </div>
                </div>
                <div className='flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20'>
                    <div className='size-10 rounded-full bg-green-500/10 flex items-center justify-center'>
                        <CheckCircle2 className='size-5 text-green-500' />
                    </div>
                    <div>
                        <div className='text-2xl font-semibold text-green-500'>{validRows}</div>
                        <div className='text-xs text-green-500/70'>Valid Rows</div>
                    </div>
                </div>
                <div className='flex items-center gap-3 p-4 rounded-lg bg-foreground/5 border border-foreground/10'>
                    <div className='size-10 rounded-full bg-blue-500/10 flex items-center justify-center'>
                        <FileSpreadsheet className='size-5 text-blue-500' />
                    </div>
                    <div>
                        <div className='text-2xl font-semibold'>{Object.keys(fieldMapping).length}</div>
                        <div className='text-xs text-muted-foreground'>Required</div>
                    </div>
                </div>
                {includeCustomFields && (
                    <>
                        <div className='flex items-center gap-3 p-4 rounded-lg bg-foreground/5 border border-foreground/10'>
                            <div className='size-10 rounded-full bg-blue-500/10 flex items-center justify-center'>
                                <Layers className='size-5 text-blue-500' />
                            </div>
                            <div>
                                <div className='text-2xl font-semibold'>{mappedExistingFields.length}</div>
                                <div className='text-xs text-muted-foreground'>Custom</div>
                            </div>
                        </div>
                        <div className='flex items-center gap-3 p-4 rounded-lg bg-foreground/5 border border-foreground/10'>
                            <div className='size-10 rounded-full bg-purple-500/10 flex items-center justify-center'>
                                <Plus className='size-5 text-purple-500' />
                            </div>
                            <div>
                                <div className='text-2xl font-semibold'>{selectedNewFields.length}</div>
                                <div className='text-xs text-muted-foreground'>New Fields</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Preview Table */}
            <div className='space-y-3'>
                <div className='text-sm font-medium'>
                    Data Preview <span className='text-muted-foreground font-normal'>(showing first {previewData.length} rows)</span>
                </div>
                <div className='border border-foreground/10 rounded-lg overflow-hidden overflow-x-auto'>
                    <Table>
                        <TableHeader>
                            <TableRow className='bg-foreground/5'>
                                {displayFields
                                    .filter(field => !field.optional || fieldMapping[field.key])
                                    .map((field) => (
                                        <TableHead key={field.key} className='text-xs font-medium whitespace-nowrap'>
                                            {field.label}
                                        </TableHead>
                                    ))}
                                {mappedExistingFields.map((field) => (
                                    <TableHead key={field.id} className='text-xs font-medium whitespace-nowrap'>
                                        <span className='flex items-center gap-1'>
                                            {field.name}
                                            <Badge variant='secondary' className='text-[9px] px-1 py-0'>custom</Badge>
                                        </span>
                                    </TableHead>
                                ))}
                                {selectedNewFields.map((field) => (
                                    <TableHead key={field.csvColumn} className='text-xs font-medium whitespace-nowrap'>
                                        <span className='flex items-center gap-1'>
                                            {field.fieldName}
                                            <Badge className='text-[9px] px-1 py-0 bg-purple-500'>new</Badge>
                                        </span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((row, rowIndex) => {
                                const rowErrors = errorsByRow.get(rowIndex) || []
                                const errorsByColumn = new Map(rowErrors.map(e => [e.column, e.error]))
                                
                                return (
                                    <TableRow key={`row-${rowIndex}`}>
                                        {displayFields
                                            .filter(field => !field.optional || fieldMapping[field.key])
                                            .map((field) => {
                                                const csvColumn = fieldMapping[field.key]
                                                const error = csvColumn ? errorsByColumn.get(csvColumn) : undefined
                                                const cellContent = getMappedValue(row, field.key)

                                                return (
                                                    <TableCell
                                                        key={field.key}
                                                        className={cn(
                                                            'text-sm whitespace-nowrap',
                                                            error && 'bg-red-500/10 text-red-500'
                                                        )}
                                                    >
                                                        {error ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className='cursor-help underline'>{cellContent}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{error}</TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            cellContent
                                                        )}
                                                    </TableCell>
                                                )
                                            })}
                                        {mappedExistingFields.map((field) => {
                                            const csvColumn = customFieldMapping[field.id]
                                            const error = csvColumn ? errorsByColumn.get(csvColumn) : undefined
                                            const cellContent = getCustomFieldValue(row, field.id)

                                            return (
                                                <TableCell
                                                    key={field.id}
                                                    className={cn(
                                                        'text-sm whitespace-nowrap',
                                                        error && 'bg-red-500/10 text-red-500'
                                                    )}
                                                >
                                                    {error ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className='cursor-help underline'>{cellContent}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{error}</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        cellContent
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                        {selectedNewFields.map((field) => {
                                            const error = errorsByColumn.get(field.csvColumn)
                                            const cellContent = row[field.csvColumn] || '-'
                                            
                                            return (
                                                <TableCell 
                                                    key={field.csvColumn} 
                                                    className={cn(
                                                        'text-sm whitespace-nowrap',
                                                        error && 'bg-red-500/10 text-red-500'
                                                    )}
                                                >
                                                    {error ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className='cursor-help underline'>{cellContent}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{error}</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        cellContent
                                                    )}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Validation Issues */}
            {invalidRows > 0 && (
                <div className='space-y-2'>
                    <div className='text-sm font-medium text-amber-600'>Rows That Will Be Skipped</div>
                    <div className='border border-foreground/10 rounded-lg overflow-hidden'>
                        {Array.from(errorsByRow.entries()).map(([rowNum, errors]) => (
                            <div key={`error-row-${rowNum}`} className='border-b border-foreground/10 last:border-b-0'>
                                <button
                                    type='button'
                                    onClick={() => setExpandedAccordion(expandedAccordion === rowNum ? null : rowNum)}
                                    className='w-full flex items-center justify-between p-3 hover:bg-foreground/5 transition-colors'
                                >
                                    <div className='flex items-center gap-2'>
                                        <AlertCircle className='size-4 text-amber-600' />
                                        <span className='text-sm font-medium'>Row {rowNum + 1}</span>
                                        <Badge variant='secondary' className='text-xs'>{errors.length} error{errors.length > 1 ? 's' : ''}</Badge>
                                    </div>
                                    <ChevronDown className={cn('size-4 transition-transform', expandedAccordion === rowNum && 'rotate-180')} />
                                </button>
                                {expandedAccordion === rowNum && (
                                    <div className='px-3 pb-3 space-y-2 bg-foreground/5'>
                                        {errors.map((error, idx) => (
                                            <div key={`error-${rowNum}-${idx}`} className='text-xs space-y-1'>
                                                <div className='font-medium text-foreground'>{error.column}</div>
                                                <div className='text-muted-foreground'>{error.error}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Fields Summary */}
            {selectedNewFields.length > 0 ? (
                <div className='p-4 rounded-lg bg-purple-500/5 border border-purple-500/20'>
                    <div className='text-sm font-medium mb-2 flex items-center gap-2'>
                        <Plus className='size-4 text-purple-500' />
                        New Custom Fields to Create
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        {selectedNewFields.map((field) => (
                            <Badge key={field.csvColumn} variant='secondary' className='text-xs'>
                                {field.fieldName}
                                <span className='ml-1 text-muted-foreground'>({field.fieldType})</span>
                            </Badge>
                        ))}
                    </div>
                    <p className='text-xs text-muted-foreground mt-2'>
                        These fields will be created as optional custom fields for your location.
                    </p>
                </div>
            ) : null}

            {/* Import Options */}
            <div className='space-y-4 p-4 rounded-lg bg-foreground/5 border border-foreground/10'>
                <div className='text-sm font-medium'>Import Options</div>

                {/* Show plan/pricing selection only when pricingPlanId is NOT mapped */}
                {!fieldMapping.pricingPlanId && (
                    <>
                        <div className='space-y-2'>
                            <Label className='text-xs uppercase font-medium text-muted-foreground'>
                                Assign to Plan (Optional)
                            </Label>
                            <Select
                                value={selectedPlanId || ''}
                                onValueChange={setSelectedPlanId}
                            >
                                <SelectTrigger className='border-foreground/10'>
                                    <SelectValue placeholder='Select a plan' />
                                </SelectTrigger>
                                <SelectContent className='border-foreground/10'>
                                    {(plans || [])
                                        .filter((p: MemberPlan) => p.id)
                                        .map((p: MemberPlan) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedPlanId && pricingOptions.length > 0 && (
                            <div className='space-y-2'>
                                <Label className='text-xs uppercase font-medium text-muted-foreground'>
                                    Select Pricing Option
                                </Label>
                                <Select
                                    value={pricingId || ''}
                                    onValueChange={setPricingId}
                                >
                                    <SelectTrigger className='border-foreground/10'>
                                        <SelectValue placeholder='Select pricing' />
                                    </SelectTrigger>
                                    <SelectContent className='border-foreground/10'>
                                        {pricingOptions.map((pricing: MemberPlanPricing) => (
                                            <SelectItem key={pricing.id} value={pricing.id}>
                                                {pricing.name} - {formatAmountForDisplay(pricing.price / 100, pricing.currency || 'usd')}/{pricing.interval || 'one-time'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <p className='text-xs text-muted-foreground'>
                            If no plan is selected, members will be added without a program or plan.
                        </p>
                    </>
                )}

                {/* Show info message when pricingPlanId is mapped */}
                {fieldMapping.pricingPlanId && (
                    <div className='p-3 rounded-lg bg-blue-500/5 border border-blue-500/20'>
                        <div className='flex items-center gap-2'>
                            <CheckCircle2 className='size-4 text-blue-500' />
                            <p className='text-sm text-blue-600'>
                                Plan assignment is controlled by the Pricing Plan ID column from your CSV.
                            </p>
                        </div>
                        <p className='text-xs text-blue-500/70 mt-1 ml-6'>
                            Each member will be assigned to the pricing option specified in their row.
                        </p>
                    </div>
                )}

                <div className='flex items-center justify-between'>
                    <div className='space-y-1'>
                        <Label className='text-xs uppercase font-medium text-muted-foreground'>
                            Require Payment
                        </Label>
                        <p className='text-xs text-muted-foreground'>
                            Members will need to add a payment method when joining
                        </p>
                    </div>
                    <Switch
                        checked={requirePayment}
                        onCheckedChange={setRequirePayment}
                    />
                </div>
            </div>

            {/* Import Button */}
            <Button
                variant='primary'
                size='lg'
                className='w-full'
                onClick={handleImport}
                disabled={isImporting || !file || isLoadingPlans}
            >
                {isLoadingPlans ? (
                    <>
                        <Loader2 className='size-4 animate-spin mr-2' />
                        Loading plans...
                    </>
                ) : (
                    <>
                        Import {validRows} of {totalRows} Members
                        {invalidRows > 0 && ` (${invalidRows} skipped)`}
                        {totalCustomFieldsCount > 0 ? ` with ${totalCustomFieldsCount} custom field${totalCustomFieldsCount > 1 ? 's' : ''}` : ''}
                    </>
                )}
            </Button>
        </div>
    )
}
