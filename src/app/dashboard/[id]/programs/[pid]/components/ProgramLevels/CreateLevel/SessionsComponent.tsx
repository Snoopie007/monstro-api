import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LevelSchema, stringToTime } from "../../../../components/schemas";
import { FormField, FormItem, FormControl, FormMessage, TimePicker, Input } from "@/components/forms";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { Icon } from "@/components/icons";
import { cn } from "@/libs/utils";

interface SessionComponentsProps {
    form: UseFormReturn<z.infer<typeof LevelSchema>>;
    index: number;
    onRemove: () => void;
}

const DaysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SessionComponents({ form, index, onRemove }: SessionComponentsProps) {
    return (
        <div className="grid grid-cols-4     gap-2 mb-2">
            <FormField
                control={form.control}
                name={`sessions.${index}.day`}
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
                control={form.control}
                name={`sessions.${index}.time`}
                render={({ field }) => (
                    <FormItem className="col-span-1">
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

            {/* Duration Input */}
            <FormField
                control={form.control}
                name={`sessions.${index}.duration`}
                render={({ field }) => (
                    <FormItem className="col-span-1">
                        <FormControl>
                            <Input type="number" placeholder="Duration" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Remove Button */}
            {index > 0 && (
                <div className="col-span-1 flex flex-row pt-3 gap-2">
                    <div>
                        <Icon name="Copy" size={14} className="cursor-pointer stroke-white" />
                    </div>
                    <div onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}>
                        <Icon name="Trash2" size={14} className="cursor-pointer stroke-red-500" />
                    </div>
                </div>
            )}
        </div>
    );
}

