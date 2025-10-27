'use client';
import { Member, FamilyPlan, MemberPackage, MemberSubscription, FamilyMember } from '@/types';
import {
    Dialog,
    DialogTitle,
    DialogSlide,
    MultiDialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";

import { cn, tryCatch } from '@/libs/utils';

import { useState } from 'react';

import { FamilyMemberForm } from '.'
import { VisuallyHidden } from 'react-aria';
import { Button } from '@/components/ui';
import { PlusIcon, User } from 'lucide-react';

// Assuming you have these components or utility from your component library,
// otherwise, you would need to implement them or replace with something else.
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from '@/components/ui/empty';

interface FamilyDialogProps {
    parentPlan: MemberSubscription | MemberPackage;
    type: 'sub' | 'pkg'
}

export function FamilyDialog({ parentPlan, type }: FamilyDialogProps) {
    const [loading, setLoading] = useState(false);
    const [slide, setSlide] = useState<'existing' | 'new'>('existing');
    const [open, setOpen] = useState(false);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

    function handleOpenChange(open: boolean) {
        setOpen(open);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 bg-foreground/10 rounded-lg">
                    <PlusIcon size={14} className="text-foreground/50" />
                </Button>
            </DialogTrigger>
            <MultiDialogContent>
                <DialogSlide show={slide === 'existing'} className="sm:max-w-[600px] rounded-lg border-foreground/10">
                    <VisuallyHidden>
                        <DialogTitle />
                    </VisuallyHidden>
                    <div>
                        {familyMembers.length > 0 ? (
                            // TODO: Render the list of family members here.
                            <div>
                                {/* Render the family members here */}
                                {familyMembers.map((member) => (
                                    <div key={member.id}>
                                        {/* Adjust this block as needed */}
                                        {member.member?.firstName} {member.member?.lastName}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <User className="size-5" />
                                    </EmptyMedia>
                                    <EmptyTitle>No family members found</EmptyTitle>
                                    <EmptyDescription>Add a family member to the member.</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </div>
                </DialogSlide>
                <DialogSlide show={slide === 'new'} className="sm:max-w-[600px] rounded-lg border-foreground/10">
                    <VisuallyHidden>
                        <DialogTitle />
                    </VisuallyHidden>
                    {/* Uncomment and pass correct props to FamilyMemberForm when ready */}
                    {/* <FamilyMemberForm parentPlanId={parentPlan.id} lid={lid} reset={() => { }} /> */}
                </DialogSlide>
            </MultiDialogContent>
        </Dialog>
    );
}
