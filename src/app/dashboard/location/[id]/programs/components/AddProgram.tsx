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

import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/usePrograms';
import { mutate as globalMutate } from 'swr';
import { Loader2 } from 'lucide-react';




export function AddProgram({ lid }: { lid: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { mutate } = usePrograms(lid);
    const form = useForm<z.infer<typeof NewProgramSchema>>({
        resolver: zodResolver(NewProgramSchema),
        defaultValues: {
            description: "",
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
        },
        mode: "onChange",
    })


    async function submitForm(v: z.infer<typeof NewProgramSchema>) {
        if (loading) return; // Prevent multiple submissions

        setLoading(true);

        try {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/programs`, {
                    method: "POST",
                    body: JSON.stringify(v)
                })
            )

            if (error || !result || !result.ok) {
                toast.error(error?.message || "Something went wrong");
                return;
            }

            toast.success("Program created successfully");

            // Refresh the data - force revalidation of ALL cache
            await mutate();
            await globalMutate((key) => typeof key === "string" && key.includes(`/api/protected/loc/${lid}/programs`));

            await sleep(1000);
            setOpen(false);
        } catch (error) {
            console.error("Error creating program:", error);
            toast.error("Failed to create program");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClick = () => {
        if (loading) return; // Prevent clicking when already loading
        form.handleSubmit(submitForm)();
    };


    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant={"create"} size={"sm"}>
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
                            </SheetSection>
                            <SheetSection>
                                <SessionComponent control={form.control} />
                            </SheetSection>
                        </form>
                    </Form>
                </ScrollArea>
                <SheetFooter className='border-t py-2 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"}>Cancel</Button>
                    </SheetClose>
                    <Button
                        variant={"foreground"}
                        size={"sm"}
                        onClick={handleSaveClick}
                        disabled={loading || !form.formState.isValid || form.formState.isSubmitting}
                        className={cn("children:hidden  ", (loading && "children:inline-block"))}
                    >
                        <Loader2 className="mr-2  animate-spin" />
                        Save
                    </Button>
                </SheetFooter>


            </SheetContent>
        </Sheet >
    )
}