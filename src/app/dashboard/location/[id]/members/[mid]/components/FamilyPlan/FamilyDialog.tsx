'use client';
import { MemberPackage, MemberSubscription } from '@/types';
import {
    Dialog,
    DialogTitle,
    DialogSlide,
    MultiDialogContent,
    DialogTrigger,
    Button,
    DialogHeader,
    DialogDescription,
} from "@/components/ui";

import { useState } from 'react';

import { FamilyMemberForm, SearchFM } from '.'
import { VisuallyHidden } from 'react-aria';
import { PlusIcon } from 'lucide-react';
import { useMemberStatus } from '../../providers';


interface FamilyDialogProps {
    familyPlans: MemberSubscription[] | MemberPackage[];
    parentPlan: MemberSubscription | MemberPackage;
}

export function FamilyDialog({ familyPlans, parentPlan }: FamilyDialogProps) {
    const { member } = useMemberStatus();
    const [slide, setSlide] = useState<'existing' | 'new'>('existing');
    const [open, setOpen] = useState(false);

    function handleOpenChange(open: boolean) {
        setOpen(open);
        if (!open) {
            setSlide('existing');
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 bg-foreground/10 rounded-lg">
                    <PlusIcon size={14} className="text-foreground/50" />
                </Button>
            </DialogTrigger>
            <MultiDialogContent>
                <DialogSlide show={slide === 'existing'} className="max-w-2xl rounded-lg">
                    <VisuallyHidden >
                        <DialogTitle></DialogTitle>
                    </VisuallyHidden>

                    <SearchFM
                        setSlide={setSlide}
                        onClose={() => handleOpenChange(false)}
                        parentPlan={parentPlan}
                        familyPlans={familyPlans}
                        fms={member?.familyMembers || []}
                    />
                </DialogSlide>
                <DialogSlide show={slide === 'new'} className="sm:max-w-[600px] rounded-lg border-foreground/10">
                    <DialogHeader className='p-4'>
                        <DialogTitle>Add Child Account</DialogTitle>
                        <DialogDescription>
                            This is only for adding a new child account who is under the age of 18.
                        </DialogDescription>
                    </DialogHeader>
                    <FamilyMemberForm parentPlan={parentPlan} setSlide={setSlide} />

                </DialogSlide>
            </MultiDialogContent>
        </Dialog>
    );
}

