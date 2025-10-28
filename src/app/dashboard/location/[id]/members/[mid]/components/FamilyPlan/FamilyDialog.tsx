'use client';
import { MemberPackage, MemberSubscription, FamilyMember } from '@/types';
import {
    Dialog,
    DialogTitle,
    DialogSlide,
    MultiDialogContent,
    DialogTrigger,
    DialogClose,
    Avatar,
    AvatarImage,
    Button,
    DialogHeader,
} from "@/components/ui";

import { cn, tryCatch } from '@/libs/utils';

import { useMemo, useState } from 'react';

import { FamilyMemberForm } from '.'
import { VisuallyHidden } from 'react-aria';
import { PlusIcon, User } from 'lucide-react';
import { useMemberStatus } from '../../providers';

import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from '@/components/ui/empty';

interface FamilyDialogProps {
    familyPlans?: MemberSubscription[] | MemberPackage[];
    parentPlan: MemberSubscription | MemberPackage;
    type: 'sub' | 'pkg'
}

export function FamilyDialog({ familyPlans, parentPlan, type }: FamilyDialogProps) {
    const { ml } = useMemberStatus();
    const [slide, setSlide] = useState<'existing' | 'new'>('existing');
    const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);
    const [open, setOpen] = useState(false);


    const filteredFamilyMembers = useMemo(() => {
        const fms = ml.knownFamilyMembers?.filter((member) => !familyPlans?.some((plan) => plan.member?.id === member.member?.id));
        if (fms && fms.length > 0) {
            setFamilyMember(fms[0]);
        }
        return fms || [];
    }, [familyPlans, parentPlan, ml.knownFamilyMembers]);

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
                <DialogSlide show={slide === 'existing'} className="sm:max-w-[600px] rounded-lg">
                    <DialogHeader className='p-4'>
                        <DialogTitle>Attach an existing family member</DialogTitle>
                    </DialogHeader>
                    <div className='px-4'>
                        {filteredFamilyMembers && filteredFamilyMembers.length > 0 ? (

                            <div className="grid grid-cols-4 gap-3">
                                {filteredFamilyMembers?.map((member) => (
                                    <FamilyMemberItem
                                        key={member.id}
                                        familyMember={member}
                                        isSelected={familyMember?.id === member.id}
                                        onSelect={() => setFamilyMember(member)}
                                    />
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
                    <div className="p-4 flex justify-between flex-row">
                        <Button variant="foreground" size="sm" className='border-foreground/10'
                            onClick={() => setSlide('new')}> New
                        </Button>
                        <div className='flex flex-row gap-2'>
                            <DialogClose asChild>
                                <Button variant="outline" size="sm" >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button variant="primary" size="sm" >Add</Button>
                        </div>
                    </div>
                </DialogSlide>
                <DialogSlide show={slide === 'new'} className="sm:max-w-[600px] rounded-lg border-foreground/10">
                    <DialogHeader className='p-4'>
                        <DialogTitle>Create a new family member</DialogTitle>
                    </DialogHeader>
                    <div className='px-4 pb-6'>
                        <FamilyMemberForm parentPlan={parentPlan} reset={() => { }} />
                    </div>

                </DialogSlide>
            </MultiDialogContent>
        </Dialog>
    );
}


interface FamilyMemberItemProps {
    familyMember: FamilyMember;
    isSelected: boolean;
    onSelect: () => void;
}

function FamilyMemberItem({ familyMember, isSelected, onSelect }: FamilyMemberItemProps) {

    return (
        <div className={cn(
            "flex flex-col items-center hover:bg-foreground/5 rounded-lg p-4 h-[130px] justify-center gap-2",
            isSelected && "bg-foreground/5",
            "cursor-pointer")
        } onClick={onSelect}>
            <Avatar className="size-10">
                <AvatarImage src={familyMember.member?.avatar || '/images/default-avatar.png'} />
            </Avatar>
            <div className="flex flex-col items-center justify-center ">
                <div className="text-sm font-medium">
                    {familyMember.member?.firstName} {familyMember.member?.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                    {familyMember.relationship}

                </div>
            </div>
        </div>
    )
}
