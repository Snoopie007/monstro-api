'use client';
import { MemberPackage, MemberSubscription } from '@/types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogTrigger,
    Button,
    DialogHeader,
    DialogDescription,
} from "@/components/ui";

import { useState } from 'react';

import { FamilyMemberForm } from '.'
import { PlusIcon } from 'lucide-react';


interface FamilyDialogProps {
    parentPlan: MemberSubscription | MemberPackage;
}

export function FamilyDialog({ parentPlan }: FamilyDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6 bg-foreground/10 rounded-lg">
                    <PlusIcon size={14} className="text-foreground/50" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-lg border-foreground/10">
                <DialogHeader className='p-4'>
                    <DialogTitle>Add Child Account</DialogTitle>
                    <DialogDescription>
                        This is only for adding a new child account who is under the age of 18.
                    </DialogDescription>
                </DialogHeader>
                <FamilyMemberForm parentPlan={parentPlan} onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

