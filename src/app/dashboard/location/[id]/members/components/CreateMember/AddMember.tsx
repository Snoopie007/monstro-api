import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui';

import React, { useState } from 'react'

import { CreateMemberForm } from '.';
import { Member } from '@/types';
import { Stripe } from 'stripe';
import { VisuallyHidden } from 'react-aria';
import { Plus, } from 'lucide-react';

interface CreateMemberProps {
    lid: string
    stripeKey: string | null
}

export type CreateMemberProgress = {
    member: Partial<Member> | undefined,
    paymentMethod: string | undefined,
    programId: number | undefined,
    planId: number | undefined,
    step: number,
    stripePaymentMethod: Stripe.PaymentMethod | undefined
}


export function AddMember({ lid, stripeKey }: CreateMemberProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} className='bg-foreground/5 flex flex-row items-center gap-2'>
                    <span>Member</span>
                    <Plus className="size-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl border-foreground/10" aria-modal>
                <VisuallyHidden>
                    <DialogTitle></DialogTitle>
                </VisuallyHidden>
                <CreateMemberForm lid={lid} />
            </DialogContent>
        </Dialog>
    )
}
