'use client'
import {
    Dialog,
    DialogTitle,
    DialogHeader,
    DialogContent,
    DialogTrigger,
    Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from '@/components/ui'

import { SupportAssistant, SupportTrigger } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/forms'
import { Loader2 } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'
import { TriggerSchema } from '@/libs/FormSchemas'
import { VisuallyHidden } from 'react-aria'
import { TriggerFields } from './TriggerFields'

interface TriggerDialogProps {
    assistant: SupportAssistant
    trigger: SupportTrigger | null
    onUpdate: (
        trigger: SupportTrigger | null,
        type: 'create' | 'update' | 'delete'
    ) => void,
    onClose: () => void
}

const InputStyle = 'rounded-md h-9 border border-foreground/10'
const DEFAULT_VALUES = {
    name: '',
    triggerType: 'keyword' as const,
    triggerPhrases: [],
    toolCall: { tool: '', parameters: {} },
    examples: [],
    requirements: [],
}
export function TriggerDialog({
    assistant,
    trigger,
    onUpdate,
    onClose,
}: TriggerDialogProps) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: DEFAULT_VALUES,
        mode: 'onChange',
    })

    useEffect(() => {
        if (trigger) {
            setOpen(true)
            form.reset({
                name: trigger.name,
                triggerType: trigger.triggerType,
                triggerPhrases: trigger.triggerPhrases.map((p) => ({
                    value: p,
                })),
                toolCall: trigger.toolCall,
                examples: trigger.examples.map((e) => ({ value: e })),
                requirements: trigger.requirements.map((r) => ({ value: r })),
            })
        }
    }, [trigger])

    async function onSubmit(v: z.infer<typeof TriggerSchema>) {
        if (!form.formState.isValid || !assistant) return

        const phrases = v.triggerPhrases.map((p) => p.value)
        const examples = v.examples.map((e) => e.value)
        const requirements = v.requirements.map((r) => r.value)

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${assistant.id}/support/settings/triggers`,
                {
                    method: trigger ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: trigger?.id,
                        name: v.name,
                        triggerType: v.triggerType,
                        triggerPhrases: phrases,
                        toolCall: v.toolCall,
                        examples: examples,
                        requirements: requirements,
                    }),
                }
            )
        )
        setLoading(false)
        if (error || !result || !result.ok) {
            return toast.error('Something went wrong')
        }
        toast.success(trigger ? 'Trigger updated' : 'Trigger created')
        const { data } = (await result?.json()) as { data: SupportTrigger[] }
        //update assistant
        setOpen(false)
        onUpdate(data[0], trigger ? 'update' : 'create')
    }

    function handleClose(open: boolean) {
        if (!open) {
            form.reset()
            onClose()
        }
        setOpen(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button
                    variant={'ghost'}
                    size={'xs'}
                    className="rounded-sm"
                    onClick={() => {
                        form.reset(DEFAULT_VALUES)
                    }}
                >
                    + Trigger
                </Button>
            </DialogTrigger>
            <DialogContent className="border-foreground/5 sm:rounded-lg">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </VisuallyHidden>
                <Form {...form}>
                    <form className="space-y-1">
                        <DialogBody className=" p-4">
                            <TriggerFields form={form} />
                        </DialogBody>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant={'outline'} size={'sm'}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                variant={'foreground'}
                                size={'sm'}
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={loading || !form.formState.isValid}
                            >
                                {loading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : trigger ? (
                                    'Update'
                                ) : (
                                    'Create'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
