import {
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
    ScrollArea,
    SheetSection
} from '@/components/ui';

import { z } from "zod";
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Textarea, FormControl, FormField, FormMessage, FormItem, FormLabel, FormDescription } from '@/components/forms';
import { cn, sleep } from "@/libs/utils";

import AddProgramSchedules from './ProgramSchedules';
import { Time } from '@internationalized/date';
import { nextApi, post } from '@/libs/api';
import { NewProgramSchema } from './schemas';
import { Icon } from '@/components/icons';
import { Session } from '@/types';



export function AddProgram({ locationId }: { locationId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const form = useForm<z.infer<typeof NewProgramSchema>>({
        resolver: zodResolver(NewProgramSchema),
        defaultValues: {
            description: "",
            programName: "",
            levels: [
                {
                    name: "",
                    sessions: [
                        {
                            day: "",
                            time: new Time(12, 0),
                            durationTime: 30,
                        }
                    ],
                    capacity: 0,
                    minAge: 0,
                    maxAge: 0,

                }
            ]
        },
        mode: "onChange",
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
        name: "levels", // unique name for your Field Array
    });


    async function submitForm(v: z.infer<typeof NewProgramSchema>) {
        // Formatting because of backend api format
        const sessions: Session[] = [];
        setLoading(true);
        v.levels.forEach((level, levelIndex) => {
            const session: Session = { status: true };
            level.sessions.forEach((s) => {
                if (!s.day || !s.time) return; // Handle undefined or null values for day and time

                const day = s.day.toLowerCase();
                session[day] = s.time.toString(); // Assign time to the corresponding day

                // Safely handle and update `duration_time` with the correct structure
                session.duration_time = JSON.stringify({
                    ...(session.duration_time ? JSON.parse(session.duration_time) : {}),
                    [day]: s.durationTime || null // Assign durationTime or null if undefined
                });
            });
            session["program_level_name"] = level.name;
            session["capacity"] = level.capacity;
            session["min_age"] = level.minAge;
            session["max_age"] = level.maxAge;

            sessions.push(session);
        });
        const body = {
            // location_id: "kxsCgZcTUell5zwFkTUc",
            program_name: v.programName,
            description: v.description,
            sessions: sessions
        };

        const res = await post({ url: `programs`, id: locationId, data: body });
        await sleep(3000);
        setLoading(false);

        setOpen(false)
    };

    function appendLevel() {
        append({
            name: "",
            sessions: [
                {
                    day: "",
                    time: new Time(12, 0),
                    durationTime: 30,
                }
            ],
            capacity: 0,
            minAge: 0,
            maxAge: 0,
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant={"foreground"} size={"xs"}>
                    + Program
                </Button>
            </SheetTrigger>
            <SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
                <SheetHeader >
                    <SheetTitle>Add a New Program</SheetTitle>
                    <SheetDescription >
                        Add a new program to your location below. Make sure  you add levels.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-150px)] w-full ">

                    <Form {...form}>
                        <form >
                            <SheetSection>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="programName"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel>Program Name</FormLabel>
                                                <FormControl>
                                                    <Input type='text' placeholder="Program Name" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>

                                        )}
                                    />


                                </fieldset>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Program Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Program Description"
                                                        className="resize-none border border-gray-200 dark:border-white"
                                                        {...field}
                                                    />
                                                </FormControl>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            </SheetSection>
                            <SheetSection>
                                <div className="mb-4 ">
                                    <FormLabel >
                                        Add Levels
                                    </FormLabel>
                                    <FormDescription>
                                        Your program may have different levels, add as many level as you like.
                                    </FormDescription>
                                </div>
                                <div>
                                    {fields.map((item, index) => (
                                        <div key={item.id} className="text-foreground px-5 rounded-sm bg-foreground/5 py-4 mb-2"  >
                                            <div className="relative space-y-2">
                                                {index !== 0 && (
                                                    <div className="flex flex-row items-center justify-end ">

                                                        <button onClick={() => { remove(index) }} className="text-red-500"                                                            >
                                                            <Icon name='Trash2' size={17} />
                                                        </button>
                                                    </div>
                                                )}
                                                <fieldset className="">
                                                    <FormField
                                                        control={form.control}
                                                        name={`levels.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem >
                                                                <FormLabel>Level Name</FormLabel>
                                                                <FormControl>
                                                                    <Input type='text' placeholder={'Level Name'} {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>

                                                        )}
                                                    />


                                                </fieldset>
                                                <fieldset className='flex flex-row items-center gap-2  w-full'>
                                                    <FormField
                                                        control={form.control}
                                                        name={`levels.${index}.capacity`}
                                                        render={({ field }) => (
                                                            <FormItem >
                                                                <FormLabel>Capacity</FormLabel>
                                                                <FormControl>
                                                                    <Input type='number' placeholder={'Capacity'}  {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>

                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`levels.${index}.minAge`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormLabel >Min Age</FormLabel>
                                                                <FormControl>
                                                                    <Input type='number' placeholder={'Min Age'} {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>

                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`levels.${index}.maxAge`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormLabel >Max Age</FormLabel>
                                                                <FormControl>
                                                                    <Input type='number' placeholder={'Max Age'} {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>

                                                        )}
                                                    />
                                                </fieldset>
                                                <AddProgramSchedules scheduleIndex={index} control={form.control} />
                                            </div>
                                        </div>
                                    ))}
                                    <button type='button'
                                        onClick={appendLevel}
                                        className="text-center border-dashed border border-gray-200 w-full py-1.5 rounded-xs text-sm">
                                        + Level
                                    </button>
                                </div>
                            </SheetSection>
                        </form>
                    </Form>
                </ScrollArea>
                <SheetFooter className='border-t py-4 px-5'>
                    <SheetClose asChild>
                        <Button variant={"outline"} className="bg-transparent">Cancel</Button>
                    </SheetClose>
                    <Button
                        variant={"foreground"}
                        onClick={form.handleSubmit(submitForm)}
                        className={cn("py-2.5  children:hidden  px-4 rounded-sm text-sm flex flex-row h-auto", (loading && "children:inline-block"))}
                    >
                        <Icon name="LoaderCircle" className="mr-2  animate-spin" />
                        Save
                    </Button>
                </SheetFooter>


            </SheetContent>
        </Sheet >
    )
}
