import React, { useEffect, useState } from 'react'
import {
    FormField, FormItem, FormLabel, FormControl,
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/forms'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { RetrievalNodeSchema } from '../schemas'
import { cn, sleep, tryCatch } from '@/libs/utils'
import { useBotBuilder } from '../../../providers/AIBotProvider'
import { Button, Skeleton } from '@/components/ui'
import { Loader2 } from 'lucide-react'



const SERVICES = [
    {
        name: "Go High Level",
        value: "ghl",
    }
]

const GHL_ACTIONS = [
    {
        name: "Get Calendar Slots",
        value: "getCalendarSlots"
    }
]


type IntegrationAction = {
    name: string,
    value: string
}

type APIFieldsProps = {
    form: UseFormReturn<z.infer<typeof RetrievalNodeSchema>>
}

export function APIFields({ form }: APIFieldsProps) {
    const { integrations, setPartnerData, partnerData } = useBotBuilder()
    const [loading, setLoading] = useState(false)
    const service = form.watch('retrieval.api.service')
    const action = form.watch('retrieval.api.action')
    const integrationId = form.watch('retrieval.api.integrationId')
    useEffect(() => {
        if (loading || !service) return;

        if (service === "ghl") {
            if (action === "getCalendarSlots" && !partnerData.calendars) {
                getCalendars()

            }
        }
    }, [service])

    async function getCalendars() {
        setLoading(true)
        const iid = form.getValues('retrieval.api.integrationId')
        if (!iid) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/integrations/${iid}/actions?action=getCalendarSlots`)
        )
        setLoading(false)
        if (error || !result) return;
        const data = await result?.json()

        setPartnerData({
            ...partnerData,
            calendars: data
        })
    }

    async function connect(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault()
        if (!service) return;
        setLoading(true)
        const integration = integrations?.find(i => i.service === service)
        await sleep(2000)
        setLoading(false)
        if (!integration) return;
        form.setValue('retrieval.api.integrationId', integration.id!)
    }


    return (
        <>
            <fieldset className="flex flex-row gap-2">
                <FormField
                    control={form.control}
                    name="retrieval.api.service"
                    render={({ field }) => (
                        <FormItem className='flex-1'>
                            <FormLabel size="tiny">Select Integration</FormLabel>
                            <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select API" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SERVICES.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                        </FormItem>
                    )}
                />
                {integrationId && (
                    <FormField
                        control={form.control}
                        name="retrieval.api.action"

                        render={({ field }) => (
                            <FormItem className='flex-1'>
                                <FormLabel size="tiny">Select an Action</FormLabel>
                                <FormControl>
                                    <Select value={field.value}
                                        onValueChange={(value: string) => {
                                            field.onChange(value)
                                            if (value === "getCalendarSlots" || !partnerData.calendars) {
                                                getCalendars()
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a Action" className='justify-start' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GHL_ACTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}  >
                                                    {option.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                )}
            </fieldset>
            {service && !integrationId && (
                <Button variant="foreground" size="sm" onClick={connect}
                    className={cn("children:hidden", { "children:block": loading })}
                >
                    <Loader2 className='size-4 animate-spin mr-2' />
                    Connect
                </Button>
            )}
            {action === "getCalendarSlots" && (
                <fieldset >
                    <FormField
                        control={form.control}
                        name="retrieval.api.calendarId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel size="tiny">Calendar</FormLabel>
                                <FormControl>
                                    {loading ? (
                                        <Skeleton className="h-10 w-full" />
                                    ) : (
                                        <Select value={field.value}
                                            onValueChange={(value: string) => {
                                                field.onChange(value)
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a Calendar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {partnerData.calendars && partnerData.calendars.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </fieldset>
            )}
        </>
    )
}
