'use client'

import React, { useState } from 'react'
import { MessageSquare, InfoIcon } from 'lucide-react'
import {
    ScrollArea,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui'
import { SupportAssistant, SupportTrigger } from '@subtrees/types'
import { FormLabel } from '@/components/forms'
import { TriggerItem } from '.'
import { TriggerDialog } from './TriggerDialog'

interface TriggerFieldsProps {
    assistant: SupportAssistant
}

export function TriggerBox({ assistant }: TriggerFieldsProps) {
    const [triggers, setTriggers] = useState<SupportTrigger[]>(
        assistant.triggers || []
    )
    const [selectedTrigger, setSelectedTrigger] =
        useState<SupportTrigger | null>(null)

    async function handleUpdate(
        trigger: SupportTrigger | null,
        type: 'create' | 'update' | 'delete'
    ) {
        if (!trigger) return
        if (type === 'create') {
            setTriggers([...triggers, trigger])
        } else if (type === 'update') {
            setTriggers(
                triggers.map((t) => (t.id === trigger.id ? trigger : t))
            )
        } else if (type === 'delete') {
            setTriggers(triggers.filter((t) => t.id !== trigger.id))
        }
    }

    return (
        <div className="bg-background rounded-lg px-4 py-2">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
                <div className="flex items-center gap-2">
                    <FormLabel size="sm">Support Triggers</FormLabel>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon
                                size={14}
                                className="text-muted-foreground"
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            Configure triggers that automatically execute
                            specific actions when members use certain phrases
                        </TooltipContent>
                    </Tooltip>
                </div>
                <TriggerDialog
                    assistant={assistant}
                    trigger={selectedTrigger}
                    onUpdate={handleUpdate}
                    onClose={() => setSelectedTrigger(null)}
                />
            </div>
            <ScrollArea className="max-h-[30vh] overflow-y-auto">
                {triggers.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare
                            size={16}
                            className="mx-auto text-muted-foreground mb-2"
                        />
                        <p className="text-sm font-medium">
                            No triggers configured yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Create your first trigger to automate responses
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 py-2">
                        {triggers?.map((trigger, index) => (
                            <TriggerItem
                                key={index}
                                trigger={trigger}
                                onSelect={setSelectedTrigger}
                                onUpdate={handleUpdate}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
