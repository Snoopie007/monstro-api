'use client'

import { AlertCircle } from 'lucide-react'

interface ValidationWarningBannerProps {
    invalidRows: number
}

export function ValidationWarningBanner({ invalidRows }: ValidationWarningBannerProps) {
    if (invalidRows <= 0) return null

    return (
        <div className='p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-3'>
            <AlertCircle className='size-5 text-amber-600 flex-shrink-0 mt-0.5' />
            <div>
                <div className='text-sm font-medium text-amber-600'>
                    {invalidRows} row{invalidRows > 1 ? 's' : ''} will be skipped
                </div>
                <p className='text-xs text-amber-600/70 mt-1'>These rows contain invalid data and will not be imported</p>
            </div>
        </div>
    )
}
