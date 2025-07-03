
import { Control, useFieldArray } from 'react-hook-form';
import {

} from "@/components/ui"
import {
    Input, Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    FormControl, FormField, FormItem, FormMessage
} from "@/components/forms";
import { z } from 'zod';
import { DaysOfWeek, NewProgramSchema } from '../schemas';
import { Button } from '@/components/ui';
import { cn, stringToTime } from '@/libs/utils';
import { Plus, X } from 'lucide-react';


interface AddProgramSessionsProps {
    control: Control<z.infer<typeof NewProgramSchema>>,
};



export default function SessionComponent({ control }: AddProgramSessionsProps) {

    const { fields, remove, append } = useFieldArray({
        control,
        name: `sessions`
    });

    return (
        <div className="bg-foreground/5 p-4 rounded-sm space-y-2">
            <div className="border-b flex flex-row items-center justify-between border-foreground/5 pb-2 gap-2">
                <div className='font-medium text-sm leading-none'> Sessions</div>

                <Button type='button'
                    variant={"ghost"}
                    size={"icon"}
                    onClick={() => append({ day: 1, duration: 30, time: "12:00" })}
                    className="size-6 bg-foreground/5 rounded-md">
                    <Plus className='size-3.5' />
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
                                    name={`sessions.${k}.day`}
                                    render={({ field, fieldState }) => (
                                        <FormItem className='col-span-1'>

                                            <FormControl>
                                                <Select onValueChange={(v) => field.onChange(parseInt(v) + 1)} value={(field.value - 1).toString()}>
                                                    <SelectTrigger className={cn({ "border-red-500": fieldState.error }, "rounded-md")}>
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
                                    name={`sessions.${k}.time`}
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
                                    name={`sessions.${k}.duration`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 ">

                                            <FormControl>
                                                <Input type='number' className={cn("rounded-md")} placeholder={'Duration'}
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
