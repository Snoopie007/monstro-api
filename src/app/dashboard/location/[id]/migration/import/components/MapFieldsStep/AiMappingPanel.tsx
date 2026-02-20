'use client'

import { AlertCircle, CheckCircle2, HelpCircle, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { Button } from '@/components/ui/button'
import type { MigrationAnalysisResult } from '@/hooks/useMigrations'

interface AiMappingPanelProps {
    headersCount: number
    aiAnalysisResult?: MigrationAnalysisResult | null
    aiAnalysisError?: string | null
    isAiAnalyzing?: boolean
    onAiAnalyze?: () => Promise<void>
    onApplySuggestions: () => void
    highConfidenceCount: number
}

export function AiMappingPanel({
    headersCount,
    aiAnalysisResult,
    aiAnalysisError,
    isAiAnalyzing,
    onAiAnalyze,
    onApplySuggestions,
    highConfidenceCount,
}: AiMappingPanelProps) {
    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <Sparkles className='size-4 text-primary' />
                    <span className='text-sm font-medium'>AI Column Mapping</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type='button'
                                className='inline-flex items-center text-muted-foreground transition-colors hover:text-foreground'
                                aria-label='AI mapping wallet requirement info'
                            >
                                <HelpCircle className='size-3.5' />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='max-w-72 text-left'>
                            Make sure your location wallet has funds before running AI analysis.
                        </TooltipContent>
                    </Tooltip>
                </div>
                {aiAnalysisResult ? (
                    <Badge variant='outline' className='text-xs'>
                        {Object.keys(aiAnalysisResult.columnMapping).length} suggestions
                    </Badge>
                ) : null}
            </div>

            {!aiAnalysisResult && !aiAnalysisError ? (
                <div className='flex items-center gap-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={onAiAnalyze}
                        disabled={isAiAnalyzing || headersCount === 0}
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
            ) : null}

            {aiAnalysisError ? (
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
            ) : null}

            {aiAnalysisResult ? (
                <div className='flex items-start gap-2 p-3 rounded-lg border border-foreground/10 bg-muted/40'>
                    <CheckCircle2 className='size-4 text-emerald-500 mt-0.5 flex-shrink-0' />
                    <div className='flex-1'>
                        <p className='text-sm'>AI analysis complete</p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                            {highConfidenceCount} high-confidence suggestions
                        </p>
                    </div>
                    <Button
                        variant='secondary'
                        size='sm'
                        onClick={onApplySuggestions}
                        className='h-7 text-xs'
                    >
                        Apply suggestions
                    </Button>
                </div>
            ) : null}
        </div>
    )
}
