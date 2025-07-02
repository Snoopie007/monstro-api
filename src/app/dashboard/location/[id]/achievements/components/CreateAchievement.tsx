'use client'

import {
    Sheet, Button, SheetContent, SheetHeader, SheetTitle,
    SheetFooter, SheetClose, ScrollArea, SheetSection,
    SheetTrigger
} from '@/components/ui';

import { z } from "zod";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn, tryCatch } from '@/libs/utils';
import {
    Input,
    Form, FormControl, FormField,
    FormMessage, FormItem, FormLabel, Textarea
} from '@/components/forms';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { AchievementSchema } from '../schemas';
import { AchievementFields } from './AchievementFields';




export function CreateAchievement({ lid }: { lid: string }) {
    const { mutate } = useSWR(`/api/protected/achievements`);

    const form = useForm<z.infer<typeof AchievementSchema>>({
        resolver: zodResolver(AchievementSchema),
        defaultValues: {
            name: '',
            description: '',
            badge: '',
            points: 0,
            requiredActionCount: 0,
        },
        mode: "onChange"
    })


    async function submitForm(v: z.infer<typeof AchievementSchema>) {
        const formData = new FormData();


        Object.entries(v).forEach(([key, value]) => {
            if (key !== 'badge' && value !== undefined) {
                formData.append(key, value.toString());
            }
        });


        if (v.badge && v.badge.startsWith('blob:')) {
            const blob = await fetch(v.badge).then(r => r.blob());
            formData.append('file', blob, 'badge.png');
        } else if (v.badge) {
            formData.append('badge', v.badge);
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements`, {
                method: 'POST',
                body: formData,
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }

        await mutate();
        toast.success("Achievement Saved");
        form.reset();
    }
    return (
        <div>
            <Sheet open={true} onOpenChange={(setOpen) => {
                if (!setOpen) {
                    form.reset();
                }
            }}>
                <SheetTrigger asChild>
                    <Button variant={"foreground"} size={"sm"}>
                        Create Achievement
                    </Button>
                </SheetTrigger>

                <SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0">
                    <SheetHeader className=" border-b">
                        <SheetTitle className='text-base font-semibold'>
                            Create Achievement
                        </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-150px)] w-full ">

                        <Form {...form}>
                            <AchievementFields form={form} />
                        </Form>
                    </ScrollArea>
                    <SheetFooter className='border-t py-3 px-4'>
                        <SheetClose asChild>
                            <Button
                                variant={"outline"} size={"sm"}
                                onClick={() => form.reset()}
                            >
                                Close
                            </Button>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button
                                onClick={form.handleSubmit(submitForm)}
                                variant={"foreground"} size={"xs"}
                            >
                                Create
                            </Button>
                        </SheetClose>
                    </SheetFooter>


                </SheetContent>
            </Sheet >
        </div >
    )
}
