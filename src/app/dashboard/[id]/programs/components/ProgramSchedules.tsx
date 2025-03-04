
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
import { Time } from '@internationalized/date';
import { z } from 'zod';
import { NewProgramSchema } from './schemas';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { cn } from '@/libs/utils';


interface AddProgramSchedulesProps {
    scheduleIndex: number, control: Control<z.infer<typeof NewProgramSchema>>,

};

const DaysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AddProgramSchedules({ scheduleIndex, control }: AddProgramSchedulesProps) {
    const { fields, remove, append } = useFieldArray({
        control,
        name: `levels.${scheduleIndex}.sessions`
    });
    function stringToTime(time: string) {
        return new Time(parseInt(time.split(":")[0]), parseInt(time.split(":")[1]));
    }
    return (
        <div className="py-3  ">
            <div className="border-b flex flex-row items-center justify-between border-foreground/5 mb-4 pb-2">
                <span className="text-sm">
                    Add a Schedules
                </span>
                <Button type='button'
                    variant={"foreground"}
                    onClick={() => append({ day: "", durationTime: 30, time: "12:00" })}
                    className=" font-medium text-[12px]  py-1  px-2 rounded-xs h-auto">
                    + Schedule
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <SelectTrigger className={cn({ "border-red-500": fieldState.error })}>
                                                        <SelectValue placeholder="Select a day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DaysOfWeek.map((day, index) => (
                                                            <SelectItem key={index} value={day}>{day}</SelectItem>
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
                                    name={`levels.${scheduleIndex}.sessions.${k}.durationTime`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 ">

                                            <FormControl>
                                                <Input type='number' className={cn("")} placeholder={'Duration'} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {k > 0 ? <div onClick={() => remove(k)} className='cursor-pointer pt-3'>
                                    <Icon name="Trash2" size={14} className=" stroke-red-500" />
                                </div> : null}
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
}
