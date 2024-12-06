
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

    return (
        <div className="py-3  ">
            <div className="border-b flex flex-row items-center justify-between border-foreground/5 mb-4 pb-2">
                <span className="text-sm">
                    Add a Schedules
                </span>
                <Button type='button'
                    variant={"foreground"}
                    onClick={() => append({ day: "", durationTime: 30, time: new Time(12, 0) })}
                    className=" font-medium text-[12px]  py-1  px-2 rounded-xs h-auto">
                    + Schedule
                </Button>
            </div>
            <div className='inline-flex flex-row items-left gap-2 '>
                {['Day', 'Time', 'Duration(mins)'].map((item) => (
                    <div key={item} className={cn('font-medium flex-initial  w-[120px] text-sm')}>
                        {item}
                    </div>
                ))}
            </div>
            <div className='space-y-2'>
                {fields.map((item, k) => {
                    return (
                        <div className='flex flex-row items-center gap-2 ' key={item.id}>
                            <FormField
                                control={control}
                                name={`levels.${scheduleIndex}.sessions.${k}.day`}
                                render={({ field }) => (
                                    <FormItem className='flex-initial min-w-[120px]'>

                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="w-full border rounded-sm bg-transparent font-normal border-x-gray-200">
                                                <SelectValue placeholder="Select a day" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DaysOfWeek.map((day, index) => (
                                                    <SelectItem key={index} value={day}>{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`levels.${scheduleIndex}.sessions.${k}.time`}
                                render={({ field }) => (
                                    <FormItem className='flex-initial min-w-[120px]'>

                                        <FormControl>
                                            <TimePicker
                                                label="Time"
                                                value={field.value}
                                                onChange={(date) => field.onChange(date ? new Time(date.hour, date.minute) : new Time(12, 0))}
                                            />
                                        </FormControl>

                                    </FormItem>

                                )}
                            />
                            <FormField
                                control={control}
                                name={`levels.${scheduleIndex}.sessions.${k}.durationTime`}
                                render={({ field }) => (
                                    <FormItem className="flex-initial w-[120px] ">

                                        <FormControl>
                                            <Input type='number' className={cn("")} placeholder={'Duration'} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {k > 0 ? <div onClick={() => remove(k)}               >
                                <Icon name="Trash2" size={16} className="cursor-pointer stroke-red-500" />
                            </div> : null}
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
