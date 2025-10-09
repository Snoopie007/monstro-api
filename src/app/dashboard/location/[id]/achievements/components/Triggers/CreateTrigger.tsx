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
import { useState } from 'react';


export function CreateTrigger() {
    const { currentAchievement, setCurrentAchievement, triggers } = useAchievements();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof TriggerSchema>>({
        resolver: zodResolver(TriggerSchema),
        defaultValues: {
            triggerId: '',
            weight: 0,
            timePeriodUnit: '',
            timePeriod: 0,
            memberPlanId: '',
        },
        mode: "onChange"
    })

    async function onSubmit(v: z.infer<typeof TriggerSchema>) {
        if (!currentAchievement) return;
        setIsSaving(true);
        const lid = currentAchievement?.locationId;
        const aid = currentAchievement?.id;

         // Build the payload with only the fields needed for this trigger type
        const payload: any = {
            triggerId: v.triggerId,
            weight: v.weight,
        };
        
        // Only include memberPlanId for plan_signup trigger (ID 4)
        if (v.triggerId === '4' && v.memberPlanId) {
            payload.memberPlanId = v.memberPlanId;
        }
        
        // Only include time period fields for attendances/referrals (IDs 2 and 3, or 1 if that's being used)
        if (['1', '2', '3'].includes(v.triggerId) && v.timePeriod && v.timePeriodUnit) {
            payload.timePeriod = v.timePeriod;
            payload.timePeriodUnit = v.timePeriodUnit;
        }
        
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/achievements/${aid}/trigger`, {
                method: 'POST',
                body: JSON.stringify(payload),
            })
        );



        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
            return;
        }

        setIsSaving(false);
        form.reset();
        setCurrentAchievement(null);
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            setCurrentAchievement(null);
        }

    }

    return (
        <>
            {currentAchievement && (
                <Sheet open={!!currentAchievement} onOpenChange={handleOpenChange}>


                    <SheetContent className="sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
                        <SheetHeader className="hidden">
                            <SheetTitle className='hidden'></SheetTitle>
                        </SheetHeader>

                        <TriggerForm lid={currentAchievement?.locationId} form={form} triggers={triggers} />
                        <SheetFooter className='border-t border-foreground/10 py-3 px-4'>
                            <SheetClose asChild>
                                <Button onClick={() => form.reset()} variant={"outline"} size={"sm"}>
                                    Cancel
                                </Button>
                            </SheetClose>
                            <Button onClick={() => onSubmit(form.getValues())} variant={"foreground"} type='submit' size={"sm"} disabled={isSaving}>
                                {isSaving ? <Loader2 className='size-3.5 animate-spin' /> : 'Create'}
                            </Button>
                        </SheetFooter>

                    </SheetContent>
                </Sheet >
            )}
        </>
    )
}
