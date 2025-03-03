
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


import React from "react";
import { Program, MemberPlan } from "@/types";

import DurationPicker from "../DurationPicker";
import { UseFormReturn } from 'react-hook-form';
import { MemberProgramSchema } from '../../schema';
import { Switch } from '@/components/ui';

interface SubFieldsProps {
    form: UseFormReturn<z.infer<typeof MemberProgramSchema>>,
    paymentMethod: string | undefined
}

export function SubFields({ form, paymentMethod }: SubFieldsProps) {


    return (
        <div className='space-y-1'>
            <div className='text-[0.7rem] uppercase font-medium'>Subscription Options <span className='text-xs text-yellow-300'   >(Optional)</span></div>

            <div className='bg-foreground/10 rounded-sm p-4 space-y-2'>
                <fieldset className="grid grid-cols-6 gap-2 items-center">

                    <div className="col-span-4 flex flex-col gap-1.5">
                        <FormLabel size="tiny" >Duration</FormLabel>
                        <DurationPicker
                            onChange={(date) => {
                                form.setValue("startDate", date.from || new Date())
                                form.setValue("sub.endDate", date.to)
                            }}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="sub.trailDays"
                        render={({ field }) => (
                            <FormItem className="col-span-2 text-xs ">
                                <FormLabel size="tiny">Trial days</FormLabel>
                                <FormControl>
                                    <Input disabled={paymentMethod !== "card"} type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </fieldset>

                <fieldset>
                    <FormField
                        control={form.control}
                        name="sub.allowProration"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">

                                <FormControl>
                                    <Switch
                                        disabled={paymentMethod !== "card"}
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm">
                                        Allow proration
                                    </FormLabel>
                                    <FormDescription className="text-xs">
                                        This will override the current subscription plan proration setting.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </fieldset>
            </div>

        </div>
    )
}

