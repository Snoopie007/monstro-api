'use client'

import React, { useState } from 'react'
import { useFieldArray, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

import {
    Button,
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui'
import {Input} from "@/components/forms";
import { FormControl, FormItem, FormField } from '@/components/forms'
import { VisuallyHidden } from 'react-aria'
import { KnowledgeBaseSchema } from '@/libs/FormSchemas/'
import { Form } from '@/components/forms'
import { Trash2, Plus, PlusIcon, Loader2 } from 'lucide-react'
import { tryCatch } from '@/libs/utils'
import { SupportAssistant } from '@subtrees/types'
import { toast } from 'react-toastify'

interface QAEntryFormProps {
    form: UseFormReturn<z.infer<typeof KnowledgeBaseSchema>>
    assistant: SupportAssistant
}
const InputStyle =
    'w-full border-none focus-visible:ring-0 focus-visible:outline-hidden rounded-none'
const FieldStyle =
    'w-full border rounded-md border-foreground/10 items-center flex flex-row gap-1 overflow-hidden space-y-0 '
export function QAEntryForm({ form, assistant }: QAEntryFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: 'qa_entries',
    })

    async function handleSubmit(v: z.infer<typeof KnowledgeBaseSchema>) {
        await form.trigger('qa_entries')
        if (!form.formState.isValid) return
        setLoading(true)

        const { result, error } = await tryCatch(
            fetch(
                `/api/protected/loc/${assistant.id}/support/settings/knowledge`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        qa_entries: v.qa_entries,
                        document: v.document,
                    }),
                }
            )
        )
        setLoading(false)
        if (error || !result || !result.ok) {
            return toast.error('Something went wrong')
        }
        toast.success('Q&A entries saved')
        setOpen(false)
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="xs"
                    variant="ghost"
                    className="hover:bg-foreground/10"
                >
                    + Edit Entries
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-4 space-y-2">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </VisuallyHidden>
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <div className=" font-medium">Question and Answer</div>
                        <p className="text-sm text-muted-foreground">
                            Here an example of a question and answer.{' '}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-sm size-5  hover:bg-foreground/10"
                        onClick={() =>
                            append({
                                id: '',
                                question: '',
                                answer: '',
                                created: new Date().toISOString(),
                            })
                        }
                    >
                        <PlusIcon className="size-4 text-muted-foreground" />
                    </Button>
                </div>
                <Form {...form}>
                    <form className="space-y-2">
                        {fields.map((field, i) => (
                            <fieldset key={i} className="flex flex-row gap-1">
                                <div className="flex flex-1 flex-col gap-1 items-center w-full">
                                    <FormField
                                        key={field.id}
                                        control={form.control}
                                        name={`qa_entries.${i}.question`}
                                        render={({ field }) => (
                                            <FormItem className={FieldStyle}>
                                                <div className="px-4 border-r border-foreground/10 h-full items-center flex">
                                                    Q
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className={InputStyle}
                                                        placeholder="Question"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`qa_entries.${i}.answer`}
                                        render={({ field }) => (
                                            <FormItem className={FieldStyle}>
                                                <div className="px-4 border-r border-foreground/10 h-full items-center flex">
                                                    A
                                                </div>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className={InputStyle}
                                                        placeholder="Answer"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
                                    onClick={() => remove(i)}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </fieldset>
                        ))}
                        <DialogFooter className="flex gap-1 pt-2 justify-end">
                            <Button
                                type="button"
                                size="sm"
                                onClick={form.handleSubmit(handleSubmit)}
                                disabled={form.formState.isSubmitting || loading}
                                variant="foreground"
                            >
								{loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={form.formState.isSubmitting}
                            >
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
