
import { Control, useFieldArray } from 'react-hook-form';
import {

} from "@/components/ui"
import {
    Input, Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    FormControl, FormField, FormItem, FormMessage, TimePicker
} from "@/components/forms";
import { z } from 'zod';
import { DaysOfWeek, NewProgramSchema } from '../schemas';
import { Button } from '@/components/ui';
import { cn, stringToTime } from '@/libs/utils';
import { X } from 'lucide-react';


interface AddProgramSessionsProps {
    scheduleIndex: number, control: Control<z.infer<typeof NewProgramSchema>>,
};



export default function SessionComponent({ scheduleIndex, control }: AddProgramSessionsProps) {

    const { fields, remove, append } = useFieldArray({
        control,
        name: `levels.${scheduleIndex}.sessions`
    });

    return (
        <div className="py-3  ">
            <div className="border-b flex flex-row items-center justify-between border-foreground/5 mb-4 pb-2">
                <span className="text-sm">
                    Add a Session
                </span>
                <Button type='button'
                    variant={"foreground"}
                    onClick={() => append({ day: 1, duration: 30, time: "12:00" })}
                    className=" font-medium text-[12px]  py-1  px-2 rounded-xs h-auto">
                    + Session
                </Button>
            </div>
            <div className='space-y-0'>
                <div className='grid grid-cols-4 gap-2 '>
                    {['Day', 'Time', 'Duration(mins)'].map((item) => (
                        <div key={item} className={cn('font-medium grid-cols-1 text-[0.625rem] uppercase')}>
                            {item}
                        </div>
                    ))}
                </div>
                <div className='space-y-1'>
                    {fields.map((item, k) => {
                        return (
                            <div className='grid grid-cols-4 gap-2  ' key={item.id}>
                                <FormField
                                    control={control}
                                    name={`levels.${scheduleIndex}.sessions.${k}.day`}
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
                                    name={`levels.${scheduleIndex}.sessions.${k}.time`}
                                    render={({ field }) => (
                                        <FormItem className={cn("col-span-1")}>
                                            <FormControl>
                                                <TimePicker
                                                    label="Time"
                                                    value={stringToTime(field.value)}
                                                    onChange={(time) =>
                                                        field.onChange(time ? time.toString() : "12:00")
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`levels.${scheduleIndex}.sessions.${k}.duration`}
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
                                {k > 0 ? <div onClick={() => remove(k)} className='cursor-pointer pt-3'>
                                    <X className='w-4 h-4 stroke-red-500' />
                                </div> : null}
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
