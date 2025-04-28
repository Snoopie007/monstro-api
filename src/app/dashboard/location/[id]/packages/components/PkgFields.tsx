
import {
    FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
    Input,
    FormDescription,
    SelectContract
} from '@/components/forms';

import { z } from "zod";
import React from "react";
import { UseFormReturn } from 'react-hook-form';
import {
    CollapsibleContent,
    Collapsible,
    CollapsibleTrigger,
    Switch,
} from '@/components/ui';
import { NewPackageSchema } from '@/libs/FormSchemas';
import { cn } from '@/libs/utils';
import { ChevronRight } from 'lucide-react';

interface SubFieldsProps {
    form: UseFormReturn<z.infer<typeof NewPackageSchema>>,
    lid: string
}

export function PlanPkgFields({ lid, form }: SubFieldsProps) {

    return (

        <div className='space-y-2'>
            <fieldset className=''>
                <FormField
                    control={form.control}
                    name="totalClassLimit"
                    render={({ field }) => (
                        <FormItem className="">
                            <FormLabel size={"tiny"}>Total Classes</FormLabel>
                            <FormControl>
                                <Input type='number' placeholder="1" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

            </fieldset>
            <Collapsible >
                <CollapsibleTrigger className="flex group flex-row items-center gap-1">
                    <ChevronRight size={15} className="group-data-[state=open]:rotate-90" />
                    <span className="text-[0.7rem] uppercase font-medium cursor-pointer">
                        Package Options {" "}
                        <span className=' text-yellow-300'>(Optional)</span>
                    </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-background rounded-sm p-4 space-y-2">
                    <fieldset className='flex flex-col gap-1 items-baseline'>
                        <FormLabel size={"tiny"}>Expires In (From Signup Date)</FormLabel>
                        <div className='grid grid-cols-3 gap-3 items-baseline'>
                            <FormField
                                control={form.control}
                                name="expireThreshold"
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
                                name="expireInterval"
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
                    </fieldset>

                    <fieldset>
                        <FormField
                            control={form.control}
                            name="contractId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={"tiny"}>Attach a Contract</FormLabel>
                                    <FormDescription className="text-xs">Leave blank to not attach a contract.</FormDescription>
                                    <SelectContract lid={lid} onChange={field.onChange} />
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

                </CollapsibleContent>
            </Collapsible>


        </div>

    )
}

