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
import { motion, AnimatePresence } from 'framer-motion';

import CreateMemberForm from './CreateMemberForm';
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
                <Button size={"sm"} variant={"foreground"} className='h-auto py-1 text-xs rounded-xs border'>
                    + Member
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg" aria-modal>
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Create Account
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    <motion.div
                        key="step1"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CreateMemberForm lid={lid} />
                    </motion.div>

                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}
