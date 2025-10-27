'use client';
import { Member, FamilyPlan } from '@/types';
import {
    Button,
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogDescription,
} from "@/components/ui";

import { cn, tryCatch } from '@/libs/utils';

import { useState, useEffect } from 'react';

import { SearchMember, FamilyMemberForm } from '.'
import { VisuallyHidden } from 'react-aria';


interface AddChildMemberProps {
    type: 'sub' | 'pkg'
    lid: string;
}




export default function AddChildMember({ type, lid }: AddChildMemberProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<number>(1);
    const [familyMember, setFamilyMember] = useState<Member | null>(null);



    useEffect(() => {
        if (familyMember) {
            setStep(3);
        }
    }, [familyMember])




    function reset() {
        setStep(1);
        setFamilyMember(null);
        setOpen(false);
    }
    function handleOpenChange(open: boolean) {
        if (!open) {
            reset()
        }
        setOpen(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size={"icon"} className='size-6 text-lg'>
                    +
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-sm border-foreground/10">
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>

            </DialogContent>
        </Dialog >
    );
}
