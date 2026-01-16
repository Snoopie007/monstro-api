'use client'

import { Dispatch, SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import { Checkbox } from '@/components/forms'
import { Badge } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/forms'
import { cn } from '@/libs/utils'
import type { CustomFieldType } from '@/types'
import type { NewCustomField } from './ImportStepperPage'

interface UnmappedColumnsSectionProps {
    newCustomFields: NewCustomField[]
    setNewCustomFields: Dispatch<SetStateAction<NewCustomField[]>>
    previewData: Record<string, string>[]
}

const fieldTypes: { value: CustomFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'select', label: 'Select' },
]

export function UnmappedColumnsSection({
    newCustomFields,
    setNewCustomFields,
}: UnmappedColumnsSectionProps) {
    const selectedCount = newCustomFields.filter(f => f.selected).length
    const allSelected = newCustomFields.length > 0 && selectedCount === newCustomFields.length

    const handleSelectAll = (checked: boolean) => {
        setNewCustomFields(prev => prev.map(f => ({ ...f, selected: checked })))
    }

    const handleSelectField = (csvColumn: string, selected: boolean) => {
        setNewCustomFields(prev =>
            prev.map(f => f.csvColumn === csvColumn ? { ...f, selected } : f)
        )
    }

    const handleTypeChange = (csvColumn: string, fieldType: CustomFieldType) => {
        setNewCustomFields(prev =>
            prev.map(f => f.csvColumn === csvColumn ? { ...f, fieldType } : f)
        )
    }

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <div>
                    <div className='text-sm font-medium flex items-center gap-2'>
                        <Plus className='size-4' />
                        Unmapped CSV Columns
                    </div>
                    <div className='text-xs text-muted-foreground mt-1'>
                        Select columns to create as new custom fields
                    </div>
                </div>
                {selectedCount > 0 ? (
                    <div className='text-sm font-medium px-3 py-1 rounded-full bg-purple-500/10 text-purple-600'>
                        {selectedCount} selected
                    </div>
                ) : null}
            </div>

            <div className='border border-foreground/10 rounded-lg overflow-hidden'>
                {/* Header */}
                <div className='flex items-center gap-4 px-4 py-2 bg-foreground/5 border-b border-foreground/10'>
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className='data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500'
                    />
                    <div className='flex-1 text-xs font-medium text-muted-foreground'>Column Name</div>
                    <div className='w-24 text-xs font-medium text-muted-foreground'>Type</div>
                    <div className='flex-1 text-xs font-medium text-muted-foreground'>Sample Values</div>
                </div>

                {/* Rows */}
                <div className='divide-y divide-foreground/5'>
                    {newCustomFields.map((field) => (
                        <div
                            key={field.csvColumn}
                            className={cn(
                                'flex items-center gap-4 px-4 py-3 transition-colors',
                                field.selected ? 'bg-purple-500/5' : 'hover:bg-foreground/[0.02]'
                            )}
                        >
                            <Checkbox
                                checked={field.selected}
                                onCheckedChange={(checked) => handleSelectField(field.csvColumn, checked as boolean)}
                                className='data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500'
                            />
                            <div className='flex-1 min-w-0'>
                                <div className='text-sm font-medium truncate'>{field.csvColumn}</div>
                                {field.selected ? (
                                    <div className='text-xs text-muted-foreground'>
                                        → {field.fieldName}
                                    </div>
                                ) : null}
                            </div>
                            <div className='w-24'>
                                <Select
                                    value={field.fieldType}
                                    onValueChange={(value) => handleTypeChange(field.csvColumn, value as CustomFieldType)}
                                    disabled={!field.selected}
                                >
                                    <SelectTrigger className={cn(
                                        'h-7 text-xs border-foreground/10',
                                        !field.selected && 'opacity-50'
                                    )}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fieldTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-1 flex-wrap'>
                                    {field.sampleValues.length > 0 ? (
                                        field.sampleValues.map((value, idx) => (
                                            <Badge
                                                key={idx}
                                                variant='secondary'
                                                className='text-[10px] px-1.5 py-0 max-w-[100px] truncate font-normal'
                                            >
                                                {value}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className='text-xs text-muted-foreground italic'>No values</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCount > 0 ? (
                <p className='text-xs text-muted-foreground'>
                    Selected columns will be created as new optional custom fields during import.
                    This won&apos;t affect existing members.
                </p>
            ) : null}
        </div>
    )
}
