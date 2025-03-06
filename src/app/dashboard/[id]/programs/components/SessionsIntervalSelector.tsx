import {
    FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    FormField,
    FormItem,
    FormControl,
    Input
} from '@/components/forms'

import React, { useState } from 'react'

import { cn } from '@/libs/utils';
import { NewProgramSchema, PresetSessionInterval, PresetSessionIntervals } from '../schemas';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

interface SessionsIntervalSelectorProps {
    form: UseFormReturn<z.infer<typeof NewProgramSchema>>,
    index: number
}

export default function SessionsIntervalSelector({ form, index }: SessionsIntervalSelectorProps) {
    const [interval, setInterval] = useState<PresetSessionInterval | undefined>();

    function handleIntervalChange(e: string) {
        const preset = PresetSessionIntervals.find(p => p.label === e);

        if (preset) {
            setInterval(preset);
            form.setValue(`levels.${index}.intervalThreshold`, preset.intervalThreshold);
            form.setValue(`levels.${index}.interval`, preset.interval as "week" | "month" | "year");
        }
    }
    return (
        <fieldset className='flex flex-row gap-2 items-baseline'>
            <div className='flex-1'>
                <FormLabel size={"tiny"} >Session Interval</FormLabel>
                <Select onValueChange={handleIntervalChange} value={interval?.label}  >

                    <SelectTrigger>
                        <SelectValue placeholder="Select interval..." />
                    </SelectTrigger>

                    <SelectContent>
                        {PresetSessionIntervals.map((preset, index) => (
                            <SelectItem key={index} value={preset.label}>
                                {preset.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className={cn("flex-1", interval?.label !== "Custom" && "hidden")}>
                <FormLabel size={"tiny"} >Every</FormLabel>
                <div className=' flex-1 grid grid-cols-3 gap-2 items-baseline'>
                    <FormField
                        control={form.control}
                        name={`levels.${index}.intervalThreshold`}
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
                        name={`levels.${index}.interval`}
                        render={({ field }) => (
                            <FormItem className="col-span-2">

                                <Select onValueChange={field.onChange} value={field.value}  >

                                    <SelectTrigger>
                                        <SelectValue placeholder="Select interval..." />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {['week', 'month', 'year'].map((preset, index) => (
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
    )
}
