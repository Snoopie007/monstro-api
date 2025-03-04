
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
import { Switch } from '@/components/ui';
import { BillingAnchorConfigSchema, NewPlanSchema, PresetIntervals } from './schemas';
import { cn } from '@/libs/utils';
import { Contract } from '@/types';


interface SubFieldsProps {
    form: UseFormReturn<z.infer<typeof NewPlanSchema>>,
    contracts: Contract[],
}

export function PlanSubFields({ contracts, form }: SubFieldsProps) {
    const [billingThreshold, setBillingThreshold] = useState<{ label: string, interval: string, intervalCount: number } | undefined>();
    function handleBillingThresholdChange(e: string) {
        const preset = PresetIntervals.find(p => p.label === e);
        if (preset) {
            setBillingThreshold(preset);
            form.setValue("intervalCount", preset.intervalCount);
            form.setValue("interval", preset.interval as "day" | "week" | "month" | "year");
        }
    }
    return (
        <div className='space-y-2'>
            <fieldset className='flex flex-row gap-2 items-baseline'>
                <div className='flex-1'>
                    <FormLabel size={"tiny"} >Billing Threshold</FormLabel>
                    <Select onValueChange={handleBillingThresholdChange} defaultValue='Monthly' value={billingThreshold?.label}  >

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
                            name="intervalCount"
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
                            name="interval"
                            render={({ field }) => (
                                <FormItem className="col-span-2">

                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={'month'} >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                        </FormControl>
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

            <div className='space-y-1'>
                <div className='text-[0.7rem] uppercase font-medium'>Additional Settings <span className='text-xs text-yellow-300'   >(Optional)</span></div>

                <div className="bg-background rounded-sm p-4 space-y-2">

                    <fieldset>
                        <FormField
                            control={form.control}
                            name="contractId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={"tiny"}>Attach a Contract</FormLabel>
                                    <FormDescription className="text-xs">Leave blank to not attach a contract.</FormDescription>
                                    <Select onValueChange={(e) => field.onChange(parseInt(e))}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a contract" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {contracts && contracts.map((contract: Contract) => (
                                                <SelectItem key={contract.id} value={`${contract.id}`}>
                                                    <div className='flex flex-col items-start leading-none space-y-0 cursor-pointer'>
                                                        <span className='text-xs font-medium'>{contract.title}</span>
                                                        <span className='text-xs text-muted-foreground'>{contract.description ? `${contract.description.substring(0, 30)}...` : "No description..."}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
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
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={'1st'} >
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

                </div>
            </div>


        </div>
    )
}

