'use client'

import { Button } from '@/components/ui/button'

interface AiIssueExample {
    columnName: string
    rowIndex: number
    originalValue: string
    suggestedFix: string
}

interface AiDataQualityPanelProps {
    aiIssuesCount: number
    aiIssueColumnsCount: number
    aiIssueExamples: AiIssueExample[]
    aiFixesPendingCount: number
    aiFixesAppliedCount: number
    onApplyAiFixes?: () => void
}

export function AiDataQualityPanel({
    aiIssuesCount,
    aiIssueColumnsCount,
    aiIssueExamples,
    aiFixesPendingCount,
    aiFixesAppliedCount,
    onApplyAiFixes,
}: AiDataQualityPanelProps) {
    if (aiIssuesCount <= 0) return null

    return (
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

            {aiFixesAppliedCount > 0 ? (
                <p className='mt-3 text-xs text-emerald-600'>
                    {aiFixesAppliedCount} AI fix{aiFixesAppliedCount > 1 ? 'es' : ''} applied to your data.
                </p>
            ) : null}
        </div>
    )
}
