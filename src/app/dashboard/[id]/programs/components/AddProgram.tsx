import {
    Button,
    Sheet,
    SheetContent,
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
import { Form, Input, Textarea, FormControl, FormField, FormMessage, FormItem, FormLabel } from '@/components/forms';
import { cn, sleep, tryCatch } from "@/libs/utils";

import SessionComponent from './ProgramSessions';
import { NewProgramSchema } from '../schemas';
import { Icon } from '@/components/icons';

import { toast } from 'react-toastify';
import { X } from 'lucide-react';



export function AddProgram({ lid }: { lid: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const form = useForm<z.infer<typeof NewProgramSchema>>({
        resolver: zodResolver(NewProgramSchema),
        defaultValues: {
            description: "",
            name: "",
            levels: [
                {
                    name: "",
                    capacity: 0,
                    minAge: 0,
                    maxAge: 0,
                    sessions: [
                        {
                            day: 1,
                            time: "12:00",
                            duration: 30,
                        }
                    ],
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

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/programs`, {
                method: "POST",
                body: JSON.stringify(v)
            })
        )

        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong");
            return;
        }
        await sleep(3000);
        setLoading(false);
    };

    function appendLevel() {
        append({
            name: "",
            sessions: [
                {
                    day: 1,
                    time: "12:00",
                    duration: 30,
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
                <SheetHeader className='space-y-0'>
                    <SheetTitle>Add a New Program</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-95px)] w-full ">

                    <Form {...form}>
                        <form >
                            <SheetSection>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel size="tiny">Program Name</FormLabel>
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
                                                <FormLabel size="tiny">Program Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Program Description"
                                                        className="resize-none"
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
                                    <div className='text-sm  font-medium'>
                                        Add Levels
                                    </div>
                                    <p className='text-xs  text-muted-foreground leading-none'>
                                        Your program may have different levels, add as many level as you like.
                                    </p>
                                </div>
                                <div>
                                    {fields.map((item, index) => (
                                        <div key={item.id} className="text-foreground px-5 rounded-sm bg-foreground/5 py-4 mb-2"  >
                                            <div className="relative space-y-2">
                                                {index !== 0 && (
                                                    <div className="flex flex-row items-center justify-end ">

                                                        <button onClick={() => { remove(index) }}                                                            >
                                                            <X className='w-4 h-4 stroke-red-500' />
                                                        </button>
                                                    </div>
                                                )}
                                                <fieldset className="">
                                                    <FormField
                                                        control={form.control}
                                                        name={`levels.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem >
                                                                <FormLabel size="tiny">Level Name</FormLabel>
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
                                                                <FormLabel size="tiny">Capacity</FormLabel>
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
                                                                <FormLabel size="tiny">Min Age</FormLabel>
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
                                                                <FormLabel size="tiny">Max Age</FormLabel>
                                                                <FormControl>
                                                                    <Input type='number' placeholder={'Max Age'} {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>

                                                        )}
                                                    />
                                                </fieldset>

                                                <SessionComponent scheduleIndex={index} control={form.control} />
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
                <SheetFooter className='border-t py-2 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"}>Cancel</Button>
                    </SheetClose>
                    <SheetClose asChild>
                        <Button
                            variant={"foreground"}
                            size={"sm"}
                            onClick={form.handleSubmit(submitForm)}
                            disabled={loading || !form.formState.isValid || form.formState.isSubmitting}
                            className={cn("children:hidden  ", (loading && "children:inline-block"))}
                        >
                            <Icon name="LoaderCircle" className="mr-2  animate-spin" />
                            Save
                        </Button>
                    </SheetClose>
                </SheetFooter>


            </SheetContent>
        </Sheet >
    )
}
