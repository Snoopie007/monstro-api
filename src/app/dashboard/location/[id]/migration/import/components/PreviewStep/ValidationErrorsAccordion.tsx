'use client'

import { AlertCircle, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/libs/utils'
import type { ValidationError } from '@/libs/validation/importValidation'

interface ValidationErrorsAccordionProps {
    invalidRows: number
    expandedAccordion: number | null
    setExpandedAccordion: (rowIndex: number | null) => void
    errorsByRow: Map<number, ValidationError[]>
}

export function ValidationErrorsAccordion({
    invalidRows,
    expandedAccordion,
    setExpandedAccordion,
    errorsByRow,
}: ValidationErrorsAccordionProps) {
    if (invalidRows <= 0) return null

    return (
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
                        {expandedAccordion === rowNum ? (
                            <div className='px-3 pb-3 space-y-2 bg-foreground/5'>
                                {errors.map((error) => (
                                    <div key={`${error.column}-${error.fieldKey}-${String(error.value)}`} className='text-xs space-y-1'>
                                        <div className='font-medium text-foreground'>{error.column}</div>
                                        <div className='text-muted-foreground'>{error.error}</div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    )
}
