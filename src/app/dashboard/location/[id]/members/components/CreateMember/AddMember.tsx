import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui';

import React, { useState } from 'react'

import { CreateMemberForm } from '.';
import { Member } from '@/types';
import { Stripe } from 'stripe';

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
                <Button size={"sm"} variant={"ghost"}
                    className='flex-1 items-center gap-1 rounded-sm bg-foreground/10 hover:bg-foreground/10' >
                    + Member
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg border-foreground/10" aria-modal>
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Create Account
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>
                <CreateMemberForm lid={lid} />
            </DialogContent>
        </Dialog>
    )
}
