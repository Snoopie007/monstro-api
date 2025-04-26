'use client'
import { useForm } from "react-hook-form"
import { z } from "zod"
import { GHLIntegrationSchema } from "../schemas"
import {
    Form,
    FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Input
} from "@/components/forms"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Link, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { NodeSettingsProps } from "../../NodeSettings"
import { useBotBuilder } from "../../../providers/AIBotProvider"
import { SheetSection } from "@/components/ui/sheet"
import { cn, sleep, tryCatch } from "@/libs/utils"
import { Skeleton } from "@/components/ui/skeleton"
import NodeSettingFooter from "../../ui/SettingFooter"
import { generateNodeId } from "../../../data/utils"

const GHL_ACTIONS = [
    {
        label: "Add to Calendar",
        value: "addToCalendar"
    },
    {
        label: "Add to Workflow",
        value: "addToWorkflow"
    },
    {
        label: "Update or Create Contact",
        value: "updateOrCreateContact"
    }
]

export function GHLIntegration({ addNodes, updateNode }: NodeSettingsProps) {
    const [loading, setLoading] = useState(false)
    const { currentNode, integrations, partnerData, setPartnerData, hasChanged } = useBotBuilder()

    const filteredIntegrations = integrations?.filter((integration) => integration.service === 'ghl')

    const { options } = currentNode || {}

    const form = useForm<z.infer<typeof GHLIntegrationSchema>>({
        resolver: zodResolver(GHLIntegrationSchema),
        defaultValues: {
            node: {
                label: '',
            },
            options: {
                integration: {
                    service: 'ghl',
                    action: options?.integration?.action,
                    integrationId: options?.integration?.integrationId,
                    workflowId: options?.integration?.workflowId,
                    calendarId: options?.integration?.calendarId,
                    contactId: options?.integration?.contactId
                }
            }
        },
        mode: "onChange",
    })



    const action = form.watch('options.integration.action')
    const integrationId = form.watch('options.integration.integrationId')


    useEffect(() => {
        if (currentNode?.id) {
            form.reset({ ...currentNode })
            const action = currentNode.options?.integration?.action
            if (action && action === 'addToCalendar') {
                fetchGHLData(action)
            }
        }
    }, [currentNode])

    useEffect(() => {
        fetchGHLData(action)
    }, [action])

    async function fetchGHLData(action: string) {
        const type = action === 'addToCalendar' ? 'calendars' : 'workflows'
        if (partnerData[type]) return;
        if (!integrationId) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/integrations/${integrationId}/actions?action=${action}`)
        )
        if (error || !result || !result.ok) return;
        const data = await result.json();
        setPartnerData({
            ...partnerData,
            [type]: data
        });
    }



    async function handleConnect(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault()
        // TODO: Connect to New GHL

    }

    async function handleUpdate(v: z.infer<typeof GHLIntegrationSchema>) {

        if (!currentNode) return;
        setLoading(true);
        hasChanged(true);

        const { node, options, ...rest } = currentNode;
        await sleep(2000);
        setLoading(false);

        if (currentNode.id) {
            updateNode(v);
        } else {
            addNodes([{ ...rest, data: { node: { ...node, ...v.node }, options: v.options }, id: `${generateNodeId()}` }]);
        }
    }

    return (
        <>

            <Form {...form}>
                <form >
                    <SheetSection>
                        <fieldset>
                            <FormField
                                control={form.control}
                                name={`node.label`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Label</FormLabel>
                                        <FormControl>
                                            <Input type="text" placeholder="Enter label" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    </SheetSection>
                    <SheetSection>
                        <div className="space-y-0 text-sm">
                            <div className="font-semibold uppercase">Go High Level Integration</div>
                            <p className="text-muted-foreground">Connect your Go High Level account to start using this node</p>
                        </div>
                        {!filteredIntegrations && (

                            <div className="flex flex-col items-center justify-center 
                        border border-dashed border-foreground/20 rounded-sm gap-2 p-4">
                                <p className="text-muted-foreground text-sm">No GHL integrations found.</p>
                                <Button variant="foreground" size="sm"
                                    onClick={handleConnect}
                                    className={cn("children:hidden", { "children:block": loading })}
                                >
                                    <Loader2 className="size-3 animate-spin mr-1" />
                                    Connect
                                </Button>
                            </div>

                        )}
                        {filteredIntegrations && (
                            <fieldset className="flex flex-row gap-2">
                                <FormField
                                    control={form.control}
                                    name={`options.integration.integrationId`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel size="tiny">Select an Account</FormLabel>

                                            <Select onValueChange={(value: string) => {
                                                field.onChange(value)
                                            }} value={field.value ? field.value.toString() : ''} >
                                                <FormControl>
                                                    <SelectTrigger className="w-full rounded-xs" >
                                                        <SelectValue placeholder="Select account" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredIntegrations?.map((integration) => (
                                                        <SelectItem key={integration.id}
                                                            value={integration.id!.toString()}>
                                                            <span className="capitalize">{integration.service}</span>
                                                            Account #{integration.id}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />


                                {integrationId && (
                                    <FormField
                                        control={form.control}
                                        name={`options.integration.action`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel size="tiny">Action</FormLabel>
                                                <Select onValueChange={(value: string) => {
                                                    if (value !== '') {
                                                        field.onChange(value)
                                                    }
                                                }} defaultValue={field.value} value={field.value} >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full rounded-xs" >
                                                            <SelectValue placeholder="Select action" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {GHL_ACTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value} className="capitalize" >
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                )}

                            </fieldset>

                        )}

                        {integrationId && action === 'addToWorkflow' && (

                            <fieldset className="bg-foreground/5 p-4 ">

                                <FormField
                                    control={form.control}
                                    name={`options.integration.workflowId`}
                                    render={({ field }) => (
                                        <FormItem  >
                                            <FormLabel size="tiny">Select Workflow</FormLabel>
                                            {partnerData.workflows ? (
                                                <Select onValueChange={(value: string) => {
                                                    if (value !== '') {
                                                        field.onChange(value)
                                                    }
                                                }} defaultValue={field.value} value={field.value} >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full rounded-xs" >
                                                            <SelectValue placeholder="Select workflow..." autoCapitalize="words" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {partnerData.workflows.map((workflow: { name: string, id: string }) => (
                                                            <SelectItem key={workflow.id} value={workflow.id} >
                                                                {workflow.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Skeleton className="w-full rounded-xs h-10 bg-foreground" />
                                            )}

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        )}
                        {integrationId && action === 'addToCalendar' && (

                            <fieldset className="bg-foreground/5 p-4 ">

                                <FormField
                                    control={form.control}
                                    name={`options.integration.calendarId`}
                                    render={({ field }) => (
                                        <FormItem  >
                                            <FormLabel size="tiny">Select Calendar</FormLabel>
                                            {partnerData.calendars ? (
                                                <Select onValueChange={(value: string) => {
                                                    if (value !== '') {
                                                        field.onChange(value)
                                                    }
                                                }} defaultValue={field.value} value={field.value} >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full rounded-xs" >
                                                            <SelectValue placeholder="Choose calendar..." autoCapitalize="words" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {partnerData.calendars.map((calendar: { name: string, id: string }) => (
                                                            <SelectItem key={calendar.id} value={calendar.id}  >
                                                                {calendar.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>

                                                </Select>
                                            ) : (
                                                <Skeleton className="w-full rounded-xs h-10 bg-foreground" />
                                            )}

                                            <FormMessage />
                                            <FormDescription>
                                                If your the selected calendar does not have any active available slots. The AI won't be able to book an appointment..
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                        )}

                    </SheetSection>
                </form>
            </Form >
            <NodeSettingFooter form={form} loading={loading} handleUpdate={handleUpdate} />
        </>
    )
}
