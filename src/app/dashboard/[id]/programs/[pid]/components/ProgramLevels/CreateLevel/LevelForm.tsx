import {
    Button,
    ScrollArea,

} from "@/components/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, SelectItem, SelectValue, SelectTrigger, Select, SelectContent } from "@/components/forms";
import { Input } from "@/components/forms/input";
import { cn, tryCatch } from "@/libs/utils";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { LevelSchema, PresetSessionInterval, PresetSessionIntervals } from "../../../../schemas";
import { SessionComponents } from "./SessionsComponent";
import { useState } from "react";

interface LevelFormProps {
    form: UseFormReturn<z.infer<typeof LevelSchema>>;
    lid: string;
}

export function LevelForm({ form, lid }: LevelFormProps) {
    const [interval, setInterval] = useState<PresetSessionInterval | undefined>();
    const { fields, append, remove } = useFieldArray({
        control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
        name: "sessions", // unique name for your Field Array
    });

    function handleIntervalChange(e: string) {
        const preset = PresetSessionIntervals.find(p => p.label === e);

        if (preset) {
            setInterval(preset);
            form.setValue("intervalThreshold", preset.intervalThreshold);
            form.setValue("interval", preset.interval as "week" | "month" | "year");
        }
    }

    async function handleRemove(index: number) {
        const field = fields[index];
        if (field.id !== undefined || field.id !== null || field.id !== "") {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/${lid}/programs/sessions/${field.id}`, {
                    method: "DELETE",
                })
            )
            if (error || !result?.ok) return;

        }
        remove(index);
    }

    return (

        <Form {...form}>
            <form className="space-y-2" >
                <fieldset>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel size={"tiny"}>Name</FormLabel>
                                <FormControl>
                                    <Input type='text' className={cn()} placeholder={'Level Name'} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset className='flex flex-row items-center gap-2  w-full'>

                    <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel size={"tiny"}>Capacity</FormLabel>
                                <FormControl>
                                    <Input type='number' className={cn()} placeholder={'Capacity'}  {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                    <FormField
                        control={form.control}
                        name="minAge"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel size={"tiny"}>Min Age</FormLabel>
                                <FormControl>
                                    <Input type='number' className={cn()} placeholder={'Min Age'} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                    <FormField
                        control={form.control}
                        name="maxAge"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel size={"tiny"}>Max Age</FormLabel>
                                <FormControl>
                                    <Input type='number' className={cn()} placeholder={'Max Age'} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                </fieldset>
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
                                name="intervalThreshold"
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
                                name="interval"
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
                <fieldset className="bg-background rounded-sm mt-4 py-4   ">
                    <div className="flex flex-row px-3 items-center justify-between">
                        <div className="text-sm  font-medium">Schedules</div>
                        <div>
                            <Button
                                variant={"foreground"}
                                size={"xs"}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    append({ id: undefined, day: 1, time: "12:00:00", duration: 30 });
                                }}
                            >
                                + Add
                            </Button>
                        </div>
                    </div>
                    <div className="border-foreground/10 mx-3 h-1 block border-b rounded-sm mt-2 mb-4 "></div>

                    <ScrollArea className="h-[250px] w-full px-3  ">
                        <div className="space-y-1">
                            <div className='grid grid-cols-4 items-start gap-2 '>
                                {['Day', 'Time', 'Duration(mins)'].map((item) => (
                                    <div key={item} className={cn('font-medium flex-initial w-[120px] text-[0.65rem] uppercase')}>
                                        {item}
                                    </div>
                                ))}
                            </div>
                            {fields.map((field, i) => (
                                <SessionComponents key={field.id} form={form} index={i} onRemove={() => handleRemove(i)} />
                            ))}
                        </div>
                    </ScrollArea>


                </fieldset>

            </form>
        </Form>


    );
}
