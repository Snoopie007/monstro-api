
import {
    FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    FormDescription,
} from '@/components/forms';

import { z } from "zod";
import React, { useState } from "react";
import { UseFormReturn } from 'react-hook-form';
import {
    Switch,
    CollapsibleContent,
    Collapsible,
    CollapsibleTrigger,
    ScrollArea,
} from '@/components/ui';
import { BillingAnchorConfigSchema, NewPlanSchema, PresetIntervals, PresetInterval } from '../../../../schemas';
import { cn } from '@/libs/utils';
import { SelectContract } from './SelectContract';
import { ChevronRight } from 'lucide-react';


interface SubFieldsProps {
    form: UseFormReturn<z.infer<typeof NewPlanSchema>>,
    lid: string
}

export function PlanSubFields({ lid, form }: SubFieldsProps) {
    const [billingThreshold, setBillingThreshold] = useState<PresetInterval | undefined>();



    function handleBillingThresholdChange(e: string) {
        const preset = PresetIntervals.find(p => p.label === e);

        if (preset) {
            setBillingThreshold(preset);
            form.setValue("subscription.intervalThreshold", preset.intervalThreshold);
            form.setValue("subscription.interval", preset.interval as "day" | "week" | "month" | "year");
        }
    }
    return (
        <div className='space-y-2'>
            <fieldset className='flex flex-row gap-2 items-baseline'>
                <div className='flex-1'>
                    <FormLabel size={"tiny"} >Billing Threshold</FormLabel>
                    <Select onValueChange={handleBillingThresholdChange} value={billingThreshold?.label}  >

                        <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>

                        <SelectContent>
                            {PresetIntervals.map((preset, index) => (
                                <SelectItem key={index} value={preset.label}>
                                    {preset.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className={cn("flex-1", billingThreshold?.label !== "Custom" && "hidden")}>
                    <FormLabel size={"tiny"} >Every</FormLabel>
                    <div className=' flex-1 grid grid-cols-3 gap-2 items-baseline'>
                        <FormField
                            control={form.control}
                            name="subscription.intervalThreshold"
                            render={({ field }) => (
                                <FormItem className="col-span-1">

                                    <FormControl>
                                        <Input type='number' placeholder="1" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subscription.interval"
                            render={({ field }) => (
                                <FormItem className="col-span-2">

                                    <Select onValueChange={field.onChange} value={field.value}  >

                                        <SelectTrigger>
                                            <SelectValue placeholder="Select interval..." />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {['day', 'week', 'month', 'year'].map((preset, index) => (
                                                <SelectItem key={index} value={preset}>
                                                    {preset}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                </FormItem>
                            )}
                        />
                    </div>
                </div>

            </fieldset>
            <Collapsible >
                <CollapsibleTrigger className="flex group flex-row items-center gap-1 ">
                    <ChevronRight size={15} className="group-data-[state=open]:rotate-90" />
                    <span className="text-[0.7rem] uppercase font-medium cursor-pointer">
                        Package Options {" "}
                        <span className=' text-yellow-300'>(Optional)</span>
                    </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-background rounded-sm py-0.5">
                    <ScrollArea className='h-[220px] p-4 space-y-2'>
                        <SelectContract lid={lid} form={form} />
                        <fieldset >
                            <FormField
                                control={form.control}
                                name="family"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">

                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm">
                                                Family Plan
                                            </FormLabel>
                                            <FormDescription className="text-xs">
                                                Allow additional family members to be added.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                        {form.getValues('family') && (
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="familyMemberLimit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Number of Family</FormLabel>
                                            <FormControl>
                                                <Input type='number' className={cn("")}
                                                    {...field}
                                                    onChange={(e) => e.target.value && field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        )}
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="subscription.billingAnchor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size={"tiny"}>Start Date</FormLabel>
                                        <FormDescription className="text-xs">
                                            Default will be today, but you can change it to the 1st or 15th of the month.
                                            <b className='text-red-500'> If allow protation is turn on the customer will be bill a proated amount before the started day if the start date is not today.</b>
                                        </FormDescription>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value} >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {BillingAnchorConfigSchema.map((anchor, index) => (
                                                        <SelectItem key={index} value={anchor.value}>
                                                            {anchor.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                        <fieldset >
                            <FormField
                                control={form.control}
                                name="subscription.allowProration"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">

                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-sm">
                                                Allow proration
                                            </FormLabel>
                                            <FormDescription className="text-xs">
                                                Proration will allow you to charge the customer while having a different anchor date.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                    </ScrollArea>
                </CollapsibleContent>
            </Collapsible>


        </div >
    )
}

