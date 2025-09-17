'use client'
import { FormLabel } from '@/components/forms/form'
import React, { useState } from 'react'
import { TriggerDialog } from './TriggerDialog'
import { SupportAssistant, SupportTrigger } from '@/types'
import { Split, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { toast } from 'react-toastify'
import { sleep } from '@/libs/utils'
import { tryCatch } from '@/libs/utils'

interface TriggerFieldProps {
    lid: string
    assistant: SupportAssistant
}

export function TriggerField({ lid, assistant }: TriggerFieldProps) {

    const [loading, setLoading] = useState(false)

    async function removeTrigger(trigger: SupportTrigger) {
        if (!assistant) return
        setLoading(true)

        const { result, error } = await tryCatch(
            fetch(`/api/protected/bots/${assistant?.id}/scenario/${trigger.id}`, {
                method: "DELETE",
            })
        )
        await sleep(1000)
        setLoading(false)
        if (error || !result || !result.ok) {
            return toast.error("Something went wrong")
        }

        const newTriggers = assistant?.triggers?.filter((s) => s.id !== trigger.id)
        //update assistant
        toast.success("Trigger removed")
    }
    return (
        <fieldset className="space-y-4 border-b border-foreground/5 pb-2">
            <div className="flex flex-row items-center justify-between">
                <FormLabel size={'sm'}>Triggers</FormLabel>
                <TriggerDialog assistant={assistant} />
            </div>
            {assistant?.triggers?.map((trigger, i) => (
                <div key={i} className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-2">
                        <div className='rounded-md bg-indigo-500 size-5 flex items-center justify-center'>
                            <Split className='size-3 text-white' />
                        </div>
                        <p className="text-sm font-medium">{trigger.name}</p>
                    </div>
                    <Button
                        onClick={() => removeTrigger(trigger)}
                        variant={'ghost'} size={'icon'}
                        className="rounded-sm size-5 hover:bg-red-500 hover:text-white"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                </div>
            ))}
        </fieldset>

    )
}
