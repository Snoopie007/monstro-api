'use client'
import { FormLabel } from '@/components/forms'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { KnowledgeBaseSchema } from '@/libs/FormSchemas'
import { InfoIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { QAEntryForm } from './QAEntryForm'
import { QAEntryList } from './QAEntryList'
import { SupportAssistant } from '@subtrees/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'

export function KBBox({ assistant }: { assistant: SupportAssistant }) {
    const form = useForm<z.infer<typeof KnowledgeBaseSchema>>({
        resolver: zodResolver(KnowledgeBaseSchema),
        defaultValues: {
            qa_entries: [],
            document: null,
        },
        mode: 'onBlur',
    })

    useEffect(() => {
        if (
            assistant.knowledgeBase.qa_entries &&
            assistant.knowledgeBase.qa_entries.length > 0
        ) {
            form.reset({
                qa_entries: assistant.knowledgeBase.qa_entries,
                document: null,
            })
        }
    }, [assistant.knowledgeBase.qa_entries])

    async function handleQADelete(entryId: string) {
        const currentEntries = form.getValues('qa_entries') || []
        const updatedEntries = currentEntries.filter(
            (entry) => entry.id !== entryId
        )

        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${assistant.id}/support/settings/knowledge`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        qa_entries: updatedEntries,
                        document: null,
                    }),
                }
            )
        )

        if (error || !result || !result.ok) {
            return toast.error('Failed to delete QA entry')
        }

        const { data } = (await result?.json()) as { data: SupportAssistant[] }
        form.setValue('qa_entries', data[0].knowledgeBase.qa_entries)
        toast.success('QA entry deleted')
        await form.trigger('qa_entries')
    }

    return (
        <div className="bg-background rounded-lg px-4 py-2">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
                <div className="flex items-center gap-2">
                    <FormLabel size="sm">Knowledge Base</FormLabel>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon
                                size={14}
                                className="text-muted-foreground"
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            Add specific questions and answers for your support
                            bot's knowledge base.
                        </TooltipContent>
                    </Tooltip>
                </div>

                <QAEntryForm form={form} assistant={assistant} />
            </div>
            <QAEntryList
                entries={form.watch('qa_entries')}
                onDelete={handleQADelete}
            />
        </div>
    )
}
