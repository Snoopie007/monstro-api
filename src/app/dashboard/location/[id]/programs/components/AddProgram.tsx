import {
    Button,
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
    ScrollArea,
    Switch
} from '@/components/ui';

import { z } from "zod";
import { useState } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form, Input, Textarea, FormControl, FormField, FormMessage, FormItem,
    FormLabel, Select, SelectTrigger, SelectValue, SelectContent,
    SelectItem, FormDescription, ProgramColorPicker
} from '@/components/forms';
import { cn, getTimezoneOffset, sleep, tryCatch } from "@/libs/utils";

import SessionComponent from './ProgramSessions';
import { NewProgramSchema } from '../schemas';

import { toast } from 'react-toastify';
import { usePrograms } from '@/hooks/usePrograms';
import { Loader2, Plus } from 'lucide-react';
import { VisuallyHidden } from 'react-aria';
import { useStaffLocations } from '@/hooks/useStaffs';




export function AddProgram({ lid }: { lid: string }) {
    const [open, setOpen] = useState(false);

    const { mutate } = usePrograms(lid);
    const { sls } = useStaffLocations(lid);
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
            instructorId: undefined,
            color: 1,
            allowWaitlist: false,
            waitlistCapacity: 0,
            allowMakeUpClass: false,
            cancelationThreshold: 0
        },
        mode: "onChange",
    })


    async function onSubmit(v: z.infer<typeof NewProgramSchema>) {


        try {
            const offsetString = getTimezoneOffset();

            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/programs`, {
                    method: "POST",
                    body: JSON.stringify(v),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Timezone-Offset': offsetString,
                    }
                })
            )

            await sleep(1000);

            if (result?.status === 403) {
                toast.error("You are not authorized to create a program");
                return;
            }

            if (error || !result || !result.ok) {
                toast.error(error?.message || "Something went wrong");
                return;
            }
            toast.success("Program created successfully");
            form.reset();
            await mutate();
            setOpen(false);
        } catch (error) {
            console.error("Error creating program:", error);
            toast.error("Failed to create program");
        }
    };



    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="primary" className="flex flex-row items-center gap-2 ">
                    <span className="font-medium">
                        Add Program
                    </span>

                    <Plus className="size-4" />

                </Button>
            </SheetTrigger>
            <SheetContent className="border-foreground/10 sm:max-w-[540px] sm:w-[540px] p-0">
                <VisuallyHidden>
                    <SheetTitle></SheetTitle>
                </VisuallyHidden>
                <ScrollArea className="h-[calc(100vh-52px)] w-full ">

                    <Form {...form}>
                        <form className='space-y-4 pt-4 pb-10 px-4'>

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
                                            <FormLabel size="tiny">Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Program Description"
                                                    className="resize-none border-foreground/10"
                                                    {...field}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="instructorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Instructor</FormLabel>
                                            <FormDescription>Select a staff member that will be assigned to the program by default. Leave blank to not assign a staff.</FormDescription>
                                            <FormControl>
                                                <Select onValueChange={(v) => field.onChange(v)} value={field.value || "null"}>
                                                    <SelectTrigger className={cn("")}>
                                                        <SelectValue placeholder="Select a instructor" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {sls.map((sl) => {
                                                            const staff = sl.staff;
                                                            return (
                                                                <SelectItem key={staff?.id ?? ''} value={staff?.id ?? ''}>
                                                                    {staff?.firstName} {staff?.lastName}
                                                                </SelectItem>
                                                            )
                                                        })}
                                                        <SelectItem value={"null"} key={"none"}>None</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Calendar Color</FormLabel>
                                            <FormDescription>Select a color for this program on the calendar.</FormDescription>
                                            <FormControl>
                                                <ProgramColorPicker
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                                <Input type='number' className={cn()} placeholder={'Capacity'}  {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
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
                                                <Input type='number' className={cn()} placeholder={'Min Age'} {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
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
                                                <Input type='number' className={cn()} placeholder={'Max Age'} {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                            </fieldset>
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="allowWaitlist"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start gap-3 rounded-lg bg-foreground/10 border border-foreground/10 py-2 px-3 ">
                                            <FormControl className="mt-1.5">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">
                                                    Allow Waitlist
                                                </FormLabel>
                                                <FormDescription className="text-xs">
                                                    Allow members to join the waitlist for the program.
                                                </FormDescription>
                                            </div>

                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            {form.getValues("allowWaitlist") && (
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="waitlistCapacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size={"tiny"}>Waitlist Capacity</FormLabel>
                                                <FormControl>
                                                    <Input type='number' className={cn()} placeholder={'Waitlist Capacity'} {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            )}
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="allowMakeUpClass"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start gap-3 rounded-lg bg-foreground/10 border border-foreground/10 py-2 px-3 ">
                                            <FormControl className="mt-1.5">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">
                                                    Allow Make Up Class
                                                </FormLabel>
                                                <FormDescription className="text-xs">
                                                    Allow members to make up a class if they miss a session.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="cancelationThreshold"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Cancelation Threshold</FormLabel>
                                            <FormControl>
                                                <Input type='number' className={cn()} placeholder={'Cancelation Threshold'} {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>

                            <SessionComponent control={form.control} />

                        </form>
                    </Form>
                </ScrollArea>
                <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} className="border-foreground/10">Cancel</Button>
                    </SheetClose>
                    <Button
                        variant={"foreground"}
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={!form.formState.isValid || form.formState.isSubmitting}

                    >
                        {form.formState.isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}

                    </Button>
                </SheetFooter>


            </SheetContent>
        </Sheet >
    )
}