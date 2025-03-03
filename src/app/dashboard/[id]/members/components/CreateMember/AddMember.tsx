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
import { ChevronRight } from 'lucide-react';
import NewMemberPayment from './MemberPaymentMethod';
import NewMemberProgram from './NewMemberProgram';
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
    const [progress, setProgress] = useState<CreateMemberProgress>({
        member: undefined,
        paymentMethod: undefined,
        programId: undefined,
        planId: undefined,
        step: 1,
        stripePaymentMethod: undefined
    });

    const steps = ['Create Account', 'Payment Method', 'Select Program'];

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
                        {steps.map((title, index) => (
                            <React.Fragment key={index}>
                                <span className={progress.step === index + 1 ? 'text-indigo-500' :
                                    index + 1 < progress.step ? 'text-foreground' : 'text-foreground/20'}>
                                    {title}
                                </span>
                                {index < steps.length - 1 && (
                                    <ChevronRight size={13} className={index + 1 < progress.step ?
                                        'text-foreground' : 'text-foreground/20'} />
                                )}
                            </React.Fragment>
                        ))}
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {progress.step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CreateMemberForm lid={lid} progress={progress} setProgress={setProgress} />
                        </motion.div>
                    )}

                    {progress.step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <NewMemberPayment lid={lid} stripeKey={stripeKey} progress={progress} setProgress={setProgress} />
                        </motion.div>
                    )}

                    {progress.step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <NewMemberProgram lid={lid} progress={progress} setProgress={setProgress} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}
