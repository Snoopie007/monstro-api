'use client'

import { Badge } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/ToolTip'
import { cn } from '@/libs/utils'
import type { ValidationError } from '@/libs/validation/importValidation'
import type { CustomFieldDefinition } from '@/types/member'
import type { NewCustomField } from '@/types/migration'

interface DisplayField {
    key: string
    label: string
    optional?: boolean
}

interface PreviewDataTableProps {
    previewData: Record<string, string>[]
    displayFields: DisplayField[]
    fieldMapping: Record<string, string>
    customFieldMapping: Record<string, string>
    mappedExistingFields: CustomFieldDefinition[]
    selectedNewFields: NewCustomField[]
    errorsByRow: Map<number, ValidationError[]>
    getMappedValue: (row: Record<string, string>, fieldKey: string) => string
    getCustomFieldValue: (row: Record<string, string>, fieldId: string) => string
}

export function PreviewDataTable({
    previewData,
    displayFields,
    fieldMapping,
    customFieldMapping,
    mappedExistingFields,
    selectedNewFields,
    errorsByRow,
    getMappedValue,
    getCustomFieldValue,
}: PreviewDataTableProps) {
    return (
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
                                <TableRow key={Object.values(row).join('|')}>
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
                                                        error && 'bg-red-500/10 text-red-500',
                                                    )}
                                                >
                                                    {error ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className='cursor-help underline'>{cellContent}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{error}</TooltipContent>
                                                        </Tooltip>
                                                    ) : cellContent}
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
                                                    error && 'bg-red-500/10 text-red-500',
                                                )}
                                            >
                                                {error ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className='cursor-help underline'>{cellContent}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{error}</TooltipContent>
                                                    </Tooltip>
                                                ) : cellContent}
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
                                                    error && 'bg-red-500/10 text-red-500',
                                                )}
                                            >
                                                {error ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className='cursor-help underline'>{cellContent}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{error}</TooltipContent>
                                                    </Tooltip>
                                                ) : cellContent}
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
    )
}
