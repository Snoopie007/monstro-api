import { cn } from '@/libs/utils';
import React from 'react'
import {
    FormField, FormItem, FormControl,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    FormMessage
} from '@/components/forms';
import { Control } from 'react-hook-form';
import { SessionSchema, DaysOfWeek } from '../../../schemas';
import { z } from 'zod';
import { stringToTime } from '@/libs/utils';
import { TimeValue } from 'react-aria';

export default function SessionFields({ control, }: { control: Control<z.infer<typeof SessionSchema>> }) {
    return (
        <fieldset className='grid grid-cols-3 gap-2  ' >
            <FormField
                control={control}
                name={`day`}
                render={({ field, fieldState }) => (
                    <FormItem className='col-span-1'>

                        <FormControl>
                            <Select onValueChange={(v) => field.onChange(parseInt(v) + 1)} value={(field.value - 1).toString()}>
                                <SelectTrigger className={cn({ "border-red-500": fieldState.error })}>
                                    <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DaysOfWeek.map((day, i) => (
                                        <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`time`}
                render={({ field }) => (
                    <FormItem className={cn("col-span-1")}>
                        <FormControl>
                            <Input type="time"
                                step="1"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="bg-background rounded-md appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none border-foreground/10"
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`duration`}
                render={({ field }) => (
                    <FormItem className="col-span-1 ">

                        <FormControl>
                            <Input type='number' className={cn("")} placeholder={'Duration'}
                                value={field.value}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value) {
                                        field.onChange(value);
                                    }
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

        </fieldset>
    )
}
