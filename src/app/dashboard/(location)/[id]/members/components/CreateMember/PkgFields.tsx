
import {
    FormControl, FormField, FormMessage, FormItem, FormLabel,
    Input,
    FormDescription,
} from '@/components/forms';
import { Popover, PopoverTrigger, PopoverContent, Calendar, Button } from '@/components/ui';
import { z } from "zod";
import React from "react";
import { UseFormReturn } from 'react-hook-form';
import { MemberProgramSchema } from '../../schema';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/libs/utils';

interface PkgFieldsProps {
    form: UseFormReturn<z.infer<typeof MemberProgramSchema>>,
    paymentMethod: string | undefined
}

export function PkgFields({ form, paymentMethod }: PkgFieldsProps) {


    return (
        <div className='space-y-1'>
            <div className='text-[0.7rem] uppercase font-medium'>Package Options <span className='text-xs text-yellow-300'   >(Optional)</span></div>

            <div className='bg-foreground/10 rounded-sm p-4 space-y-2'>
                <fieldset className='grid grid-cols-2 gap-2 items-center'>
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel size="tiny">Start Date</FormLabel>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full border-none pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            fromDate={new Date()}
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pkg.expireDate"
                        render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel size="tiny">Expire Date</FormLabel>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full border-none pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            fromDate={new Date()}
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset >

                    <FormField
                        control={form.control}
                        name="pkg.totalClassLimit"
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel size="tiny">Total Class Limit</FormLabel>
                                <FormDescription className="text-xs">You may overwrite the total class limit for this package.</FormDescription>
                                <FormControl>
                                    <Input type="number" className="border-none" max={100} placeholder="Total Class Limit" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem >
                        )}
                    />

                </fieldset>


            </div>

        </div>
    )
}

