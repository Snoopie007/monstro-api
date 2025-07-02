'use client'

import {
    Sheet, Button, SheetContent,
    SheetHeader, SheetTitle,
    SheetTrigger
} from '@/components/ui';

import { AchievementForm, TriggerForm } from '.';
import { useState } from 'react';
import { AchievementTrigger } from '@/types';

interface CreateAchievementProps {
    lid: string;
    triggers: AchievementTrigger[];
}

export function CreateAchievement({ lid, triggers }: CreateAchievementProps) {

    const [open, setOpen] = useState(false);
    const [achievementId, setAchievementId] = useState<string | null>(null);


    return (
        <div>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button size={"sm"} variant={"ghost"}
                        className='flex-1 items-center gap-1 rounded-sm bg-foreground/10 hover:bg-foreground/10' >
                        Create Achievement
                    </Button>
                </SheetTrigger>

                <SheetContent className="sm:max-w-[540px] sm:w-[540px] p-0 border-foreground/10">
                    <SheetHeader className="hidden">
                        <SheetTitle className='hidden'></SheetTitle>
                    </SheetHeader>

                    {achievementId ? (
                        <TriggerForm lid={lid} onFinish={() => setOpen(false)} triggers={triggers} aid={achievementId} />

                    ) : (
                        <AchievementForm lid={lid} onFinish={(a) => {
                            setAchievementId(a.id);

                        }} />
                    )}

                </SheetContent>
            </Sheet >
        </div >
    )
}
