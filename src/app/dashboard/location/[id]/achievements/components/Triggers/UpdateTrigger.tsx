'use client'

import {
    Sheet, Button, SheetContent, SheetHeader, SheetTitle,
    SheetFooter, SheetClose,
    SheetTrigger,
} from '@/components/ui';

import { z } from "zod";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tryCatch } from '@/libs/utils';

import { toast } from 'react-toastify';
import { TriggerSchema } from '../../schemas';
import { Achievement, TriggeredAchievement } from '@/types';
import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { TriggerForm } from './TriggerForm';
import { useAchievements } from '../../providers';

interface UpdateTriggerProps {
    achievement: Achievement;
    ta: TriggeredAchievement;
}

export function UpdateTrigger({ achievement, ta }: UpdateTriggerProps) {

    const { triggers } = useAchievements();
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: {
            triggerId: ta.triggerId.toString(),
            weight: ta.weight ?? 0,
            timePeriod: ta.timePeriod ?? 0,
            timePeriodUnit: ta.timePeriodUnit ?? '',
            memberPlanId: ta.memberPlanId ?? '',
        },
        mode: "onChange"
    })
    async function onSubmit(v: z.infer<typeof TriggerSchema>) {

        const lid = achievement.locationId;
        const aid = achievement.id;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements/${aid}/triggers`, {
                method: 'PATCH',
                body: JSON.stringify(v),
            })
        );

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }
        handleOpenChange(false);
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            form.reset();
        }
        setOpen(open);
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant={"ghost"} size={"icon"} className='size-5'>
                    <Pencil className='size-3' />
                </Button>
            </SheetTrigger>
            <SheetContent className="max-w-[40%] bg-background w-[40%] sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
                <SheetHeader className="hidden">
                    <SheetTitle className='hidden'>

                    </SheetTitle>
                </SheetHeader>
                <TriggerForm lid={achievement.locationId} form={form} triggers={triggers} />
                <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
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
                            onClick={form.handleSubmit(onSubmit)}
                            variant={"foreground"} size={"sm"}
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? <Loader2 className='size-4 animate-spin' /> : 'Update'}
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet >
    )
}
