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

interface AddChildMemberProps {
    parent: Member;
    lid: string;
}

const TYPES = [
    {
        name: "Existing Member",
        description: "Select this if a family member already exists at this location.",
    },
    {
        name: "New Member",
        description: "Select this if a family member does not exist at this location.",
    },
]


export default function AddChildMember({ parent, lid }: AddChildMemberProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<number>(1);
    const [familyMember, setFamilyMember] = useState<Member | null>(null);
    const [familyPlans, setFamilyPlans] = useState<FamilyPlan[]>([]);

    useEffect(() => {
        fetchFamilyPlans();
    }, []);

    useEffect(() => {
        if (familyMember) {
            setStep(3);
        }
    }, [familyMember])

    async function fetchFamilyPlans() {
        setIsLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${parent.id}/family`)
        )
        setIsLoading(false);
        if (error || !result || !result.ok) return
        const data = await result.json();
        setFamilyPlans(data);
    }


    function reset() {
        setStep(1);
        setFamilyMember(null);
        setOpen(false);
    }


    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!open) {
                reset()
            }
            setOpen(open)
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-y-0 border-r-0 rounded-none border-foreground/10">
                    + Family to Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-sm">
                <DialogHeader className="space-y-0 gap-0">
                    <DialogTitle>
                        Add Family to Plan
                    </DialogTitle>
                    <DialogDescription className="hidden"></DialogDescription>
                </DialogHeader>


                {!isLoading && familyPlans.length < 1 && (
                    <DialogBody>
                        <p className='text-sm text-muted-foreground text-center'>
                            No family plans found.
                            Please subscribe to a family plan first.
                        </p>
                    </DialogBody>
                )}
                {!isLoading && familyPlans.length > 0 && (
                    <>
                        {step === 1 && (
                            <DialogBody>
                                <div className='space-y-2' >
                                    {TYPES.map((t, i) => (
                                        <div key={i} className={cn(
                                            "border group rounded-sm p-4 bg-background hover:bg-indigo-500 hover:text-white cursor-pointer",
                                        )}
                                            onClick={() => setStep(t.name === 'New Member' ? 3 : 2)}
                                        >
                                            <div className='text-sm font-medium'>{t.name}</div>
                                            <p className='text-xs group-hover:text-white text-muted-foreground'>{t.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </DialogBody>
                        )}
                        {step === 2 && (
                            <SearchMember
                                parentId={parent.id}
                                lid={lid}
                                familyMember={familyMember}
                                setFamilyMember={setFamilyMember}
                                reset={reset}
                            />
                        )}
                        {step === 3 && (
                            <FamilyMemberForm
                                familyMember={familyMember}
                                familyPlans={familyPlans}
                                parent={parent}
                                lid={lid}
                                reset={reset}
                            />
                        )}
                    </>
                )}


            </DialogContent>
        </Dialog >
    );
}
