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
import { Plus } from 'lucide-react';

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
                                    <p className='text-muted-foreground'>
                                        Select the type of member you want to add:
                                    </p>
                                    <div className='grid grid-cols-2 gap-2'>
                                        {TYPES.map((t, i) => (
                                            <div key={i} className={cn(
                                                "border  rounded-lg p-4 border-foreground/10 h-[100px] space-y-1 hover:text-indigo-500 cursor-pointer",
                                            )}
                                                onClick={() => setStep(t.name === 'New Member' ? 3 : 2)}
                                            >
                                                <div className='font-bold'>
                                                    {t.name}
                                                </div>
                                                <p className='text-sm text-muted-foreground'>
                                                    {t.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
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
