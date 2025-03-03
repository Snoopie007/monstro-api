import {
    DialogBody,
    DialogFooter,
    Button
} from '@/components/ui'

import { Elements } from "@stripe/react-stripe-js";
import { Stripe } from 'stripe';
import { CreateMemberProgress } from './AddMember';
import { Dispatch, useEffect, useState } from 'react';
import { SetStateAction } from 'react';

import { cn, tryCatch } from '@/libs/utils';
import { getStripe } from '@/libs/client/stripe';
import NewMemberPaymentForm from './NewMemberPaymentForm';

import { toast } from 'react-toastify';


interface NewMemberPaymentProps {
    lid: string,
    stripeKey: string | null,
    progress: CreateMemberProgress,
    setProgress: Dispatch<SetStateAction<CreateMemberProgress>>
}

const paymentMethods = [
    {
        id: 'cash',
        name: 'Manual',
        description: 'This is for any cash, check, or zeal payments.'
    },

    {
        id: 'invite',
        name: 'Send Email Invite',
        description: 'Send an email invitation for the member to add their own payment method.'
    },
    {
        id: 'card',
        name: 'Credit Card',
        description: 'Add a credit card payment method for this member.'
    }
]

export default function NewMemberPayment({ lid, stripeKey, progress, setProgress }: NewMemberPaymentProps) {
    const [selectedMethod, setSelectedMethod] = useState<string>();
    const [stripePayment, setStripePayment] = useState<Stripe.PaymentMethod | undefined>(undefined);
    const [loading, setLoading] = useState(false);


    async function handleContinue() {
        setLoading(true);
        if (progress.paymentMethod === "card" && !stripePayment) {
            toast.error("You must add a valid credit card to continue.");
            return;
        }

        if (selectedMethod === "invite") {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/${lid}/members/${progress.member?.id}/invite`, { method: "POST" })
            )
            setLoading(false);
            if (error || !result || !result.ok) {
                toast.error("Something went wrong, please try again.");
                return;
            }

        }
        setLoading(false);
        setProgress({
            ...progress,
            step: 3,
            stripePaymentMethod: stripePayment
        });
    };

    function handleSkip() {
        // Skip payment method step
        setProgress({
            ...progress,
            step: 3
        });
    };

    useEffect(() => {
        if (selectedMethod) {
            setProgress({
                ...progress,
                paymentMethod: selectedMethod
            });
        }
    }, [selectedMethod]);


    return (
        <>
            <DialogBody>
                <div className='space-y-4'>
                    <div className='space-y-2'>
                        {paymentMethods.map((method) => (
                            <div key={method.id} className={cn(
                                'flex items-start gap-3 border bg-background border-foreground/20 rounded-sm p-4 cursor-pointer',
                                'hover:border-indigo-500 hover:text-indigo-500',
                                selectedMethod === method.id && 'border-indigo-500 text-indigo-500'
                            )}
                                onClick={() => setSelectedMethod(method.id)}
                            >
                                <div className='flex flex-col gap-1.5'>
                                    <div className='text-sm font-medium leading-none'>{method.name}</div>
                                    <p className="text-xs text-muted-foreground">{method.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(stripeKey && selectedMethod === "card") && (
                        <>
                            {stripePayment ? (
                                <div className='space-y-2'>
                                    <div className='uppercase text-white text-xs'>            Credit Card on file</div>
                                    <div className='text-sm bg-indigo-500/40  text-white rounded-sm px-4 py-2  flex justify-between  items-center '>
                                        <div className='text-sm flex-1 items-center'>
                                            <span className='capitalize'>{stripePayment.card?.brand} {" "}</span>
                                            {stripePayment.card?.funding} •••• {stripePayment.card?.last4}

                                        </div>
                                        <div className='text-sm flex-1 text-right'>
                                            <p>expires on {stripePayment.card?.exp_month}/{stripePayment.card?.exp_year}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Elements
                                    stripe={getStripe(stripeKey)}
                                    options={{
                                        appearance: {
                                            variables: {
                                                colorIcon: "#6772e5",
                                                fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                                            },
                                        },
                                    }}
                                >
                                    <NewMemberPaymentForm setStripePayment={setStripePayment} member={progress.member!} lid={lid} />

                                </Elements>
                            )}
                        </>
                    )}
                </div>
            </DialogBody>
            <DialogFooter className="flex justify-between">
                <Button
                    variant={"outline"}
                    size={"sm"}
                    onClick={handleSkip}
                >
                    Skip
                </Button>
                <Button
                    variant={"foreground"}
                    size={"sm"}
                    onClick={handleContinue}
                    disabled={!selectedMethod || (selectedMethod === "card" && !stripePayment)}
                >
                    Continue
                </Button>
            </DialogFooter>
        </>
    )
}
