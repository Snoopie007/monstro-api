'use client'

import React from 'react'
import { Button } from '@/components/ui'
import {
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormField,
} from '@/components/forms'
import { Trash2 } from 'lucide-react'
import { TriggerSchema } from '@/libs/FormSchemas'
import { useFieldArray, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

const AVAILABLE_TOOLS = [
    {
        tool: 'GetMemberSessions',
        description:
            'Get classes and sessions the member can book based on their active subscriptions and available packages',
        parameters: {},
    },
    {
        tool: 'GetMemberPlans',
        description:
            'When member requests plans information, trigger this tool.',
        parameters: {},
    },

    {
        tool: 'SearchKnowledgeBase',
        description:
            'Search the knowledge base for general facility information, policies, and frequently asked questions',

        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query for the knowledge base',
                },
            },
            required: ['query'],
        },
    },
    {
        tool: 'EscalateToHuman',
        description:
            'When member requests to speak to a human or human agent, trigger this tool.',

        parameters: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'Reason for escalation',
                },
                urgency: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Urgency level of the escalation',
                },
            },
            required: ['reason', 'urgency'],
        },
    },
]

interface FieldProps {
    form: UseFormReturn<z.infer<typeof TriggerSchema>>
}

function TriggerPhrasesField({ form }: FieldProps) {
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: 'triggerPhrases',
    })

    return (
        <fieldset className="space-y-2">
            <FormLabel size="sm">Trigger Phrases</FormLabel>
            <div className=" border bg-foreground/5 border-foreground/10 rounded-md p-2 space-y-1">
                <div className="space-y-1">
                    {fields.map((field, index) => (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`triggerPhrases.${index}`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-1 items-center">
                                        <FormControl>
                                            <Input
                                                value={field.value.value}
                                                onChange={(e) =>
                                                    field.onChange({
                                                        value: e.target.value,
                                                    })
                                                }
                                                onBlur={field.onBlur}
                                                name={field.name}
                                            />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                <Button
                    type="button"
                    variant="foreground"
                    size="xs"
                    className="rounded-sm "
                    onClick={() => append({ value: '' })}
                    disabled={fields.length >= 4}
                >
                    + Trigger Phrase
                </Button>
            </div>
        </fieldset>
    )
}

function ExampleField({ form }: FieldProps) {
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: 'examples',
    })

    return (
        <fieldset className="space-y-1">
            <FormLabel size="sm">Examples</FormLabel>
            <div className=" border bg-foreground/5 border-foreground/10 rounded-md p-2 space-y-1">
                <div className="space-y-1">
                    {fields.map((field, index) => (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`examples.${index}`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-1 items-center">
                                        <FormControl>
                                            <Input
                                                value={field.value.value}
                                                onChange={(e) =>
                                                    field.onChange({
                                                        value: e.target.value,
                                                    })
                                                }
                                                onBlur={field.onBlur}
                                            />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                <Button
                    type="button"
                    variant="foreground"
                    size="xs"
                    className="rounded-sm "
                    onClick={() => append({ value: '' })}
                    disabled={fields.length >= 4}
                >
                    + Example
                </Button>
            </div>
        </fieldset>
    )
}

function RequirementField({ form }: FieldProps) {
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: 'requirements',
    })

    return (
        <fieldset className="space-y-2">
            <FormLabel size="sm">Requirements</FormLabel>
            <div className="space-y-1 border bg-foreground/5 border-foreground/10 rounded-md p-2 ">
                <div className="space-y-1">
                    {fields.map((field, index) => (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`requirements.${index}`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-1 items-center">
                                        <FormControl>
                                            <Input
                                                value={field.value.value}
                                                onChange={(e) =>
                                                    field.onChange({
                                                        value: e.target.value,
                                                    })
                                                }
                                                onBlur={field.onBlur}
                                                name={field.name}
                                            />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-sm size-5 hover:bg-red-500 hover:text-white transition-all duration-200"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                <Button
                    type="button"
                    variant="foreground"
                    size="xs"
                    className="rounded-sm "
                    onClick={() => append({ value: '' })}
                    disabled={fields.length >= 4}
                >
                    + Requirement
                </Button>
            </div>
        </fieldset>
    )
}

export function TriggerFields({ form }: FieldProps) {
    return (
        <>
            <fieldset>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">Trigger Name</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="triggerType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">Trigger Type</FormLabel>
                            <FormControl>
                                <Select value={field.value} onValueChange={field.onChange} key={field.value}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['keyword', 'intent', 'condition'].map(
                                            (type) => (
                                                <SelectItem
                                                    key={type}
                                                    value={type}
                                                    className="capitalize"
                                                >
                                                    {type}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="toolCall"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">Tool to Execute</FormLabel>
                            <FormControl>
                                <Select
                                    value={field.value?.tool || ''}
                                    onValueChange={(value) => {
                                        const selectedTool =
                                            AVAILABLE_TOOLS.find(
                                                (tool) => tool.tool === value
                                            )
                                        if (selectedTool) {
                                            field.onChange({
                                                tool: selectedTool.tool,
                                                parameters:
                                                    selectedTool.parameters,
                                                description:
                                                    selectedTool.description,
                                            })
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a tool" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_TOOLS.map((tool) => (
                                            <SelectItem
                                                key={tool.tool}
                                                value={tool.tool}
                                            >
                                                {tool.tool
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .trim()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            {field.value?.tool && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {
                                        AVAILABLE_TOOLS.find(
                                            (tool) =>
                                                tool.tool === field.value?.tool
                                        )?.description
                                    }
                                </p>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <TriggerPhrasesField form={form} />
            <ExampleField form={form} />
            <RequirementField form={form} />
        </>
    )
}
