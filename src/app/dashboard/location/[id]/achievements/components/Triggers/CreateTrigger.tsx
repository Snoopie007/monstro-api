'use client'

import {
    Sheet, Button, SheetContent,
    SheetHeader, SheetTitle,
    SheetFooter,
    SheetClose,
} from '@/components/ui';


import { TriggerSchema } from '../../schemas';
import { useForm } from 'react-hook-form';
import { useAchievements } from '../../providers';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { tryCatch } from '@/libs/utils';
import { Loader2 } from 'lucide-react';
import { TriggerForm } from '.';



export function CreateTrigger() {

    const { currentAchievement, setCurrentAchievement, triggers } = useAchievements();


    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: {
            triggerId: '',
            weight: 0,
            timePeriodUnit: '',
            timePeriod: 0,
            planId: '',
        },
        mode: "onChange"
    })

    async function onSubmit(v: z.infer<typeof TriggerSchema>) {

        const lid = currentAchievement?.locationId;
        const aid = currentAchievement?.id;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements/${aid}/triggers`, {
                method: 'POST',
                body: JSON.stringify(v),
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }

        form.reset();
        setCurrentAchievement(null);
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            setCurrentAchievement(null);
        }

    }

    return (
        <Sheet open={!!currentAchievement} onOpenChange={handleOpenChange}>


            <SheetContent className="sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
                <SheetHeader className="hidden">
                    <SheetTitle className='hidden'></SheetTitle>
                </SheetHeader>

                <TriggerForm form={form} triggers={triggers} />
                <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
                    <SheetClose asChild>
                        <Button variant={"outline"} size={"sm"}>
                            Cancel
                        </Button>
                    </SheetClose>
                    <Button type='submit' size={"sm"} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin' /> : 'Create'}
                    </Button>
                </SheetFooter>

            </SheetContent>
        </Sheet >
    )
}
