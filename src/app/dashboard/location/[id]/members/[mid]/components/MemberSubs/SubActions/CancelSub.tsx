'use client'
import React, { useState, } from 'react'
import {
    DialogFooter,
    Button,
    DialogClose,
} from "@/components/ui";
import { RadioGroup, RadioGroupItem, Label, Textarea } from '@/components/forms';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { MemberSubscription } from '@/types/member';
import { cn, tryCatch } from '@/libs/utils';
import { useParams } from 'next/navigation';
import { RefundOptions } from '.';

interface CancelSubProps {
    sub: MemberSubscription;
    show: boolean;
    close: () => void;
}

export function CancelSub({ sub, show, close }: CancelSubProps) {
    const params = useParams();
    const [loading, setLoading] = useState(false);

    const [formState, setFormState] = useState({
        cancelOption: 'now' as 'now' | 'end' | 'custom',
        customDate: '',
        refundAmount: 0,
        refundReason: '',
    });


    const handleSubmit = async () => {
        // Validate inputs first
        if (!sub?.id || !params?.id || !params?.mid) {
            console.log(sub.id, params.id, params.mid);
            toast.error('Missing required information');
            return;
        }

        if (formState.cancelOption === 'custom' && !formState.customDate) {
            toast.error('Please select a cancellation date');
            return;
        }


        setLoading(true);




        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subscriptions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState),
            })
        );

        setLoading(false);

        if (error || !result || !result.ok) {
            const errorData = await result?.json().catch(() => ({}));
            toast.error(errorData.error || 'Failed to cancel subscription');
            return;
        }

        toast.success('Subscription cancellation processed');
        close();
    };

    return (
        <div className={cn(show ? 'block' : 'hidden')}>
            <div className='p-4 pt-6 space-y-6'>
                <div className="grid grid-cols-4 gap-4">
                    <div className="font-medium col-span-1 text-sm">Cancel</div>
                    <RadioGroup
                        value={formState.cancelOption}
                        onValueChange={(value) => setFormState(prev => ({ ...prev, cancelOption: value as 'now' | 'end' | 'custom' }))}
                        className="space-y-2 text-sm col-span-3"
                    >
                        <div className="flex flex-row items-start gap-3">
                            <RadioGroupItem value="now" id="now" />

                            <div className='space-y-0'>
                                <Label htmlFor="now" className='text-sm cursor-pointer'>
                                    Immediately
                                </Label>
                                <div className='text-xs text-muted-foreground'>
                                    {format(new Date(), 'MMM d, yyyy')}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-start gap-3">
                            <RadioGroupItem value="period_end" id="period_end" />

                            <div className='space-y-0'>
                                <Label htmlFor="period_end" className='text-sm cursor-pointer'>
                                    End of current period
                                </Label>
                                <div className='text-xs text-muted-foreground'>
                                    {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center gap-3">
                            <RadioGroupItem value="custom_date" id="custom" />

                            <div className='space-y-0'>
                                <Label htmlFor="custom" className='text-sm cursor-pointer'>
                                    On custom date
                                </Label>
                                {formState.cancelOption === 'custom' && (
                                    <></>
                                )}
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                {sub.stripeSubscriptionId && (
                    <RefundOptions
                        onChange={(value) => {
                            setFormState(prev => ({
                                ...prev,
                                refundAmount: value
                            }));
                        }}
                        amount={sub.plan?.price || 0}
                    />
                )}

                <div className="grid grid-cols-4 gap-4" >
                    <Label className='text-sm col-span-1'>Reason</Label>
                    <Textarea
                        id="reason"
                        value={formState.refundReason}
                        className='border-foreground/10 col-span-3 resize-none'
                        onChange={(e) => setFormState(prev => ({ ...prev, refundReason: e.target.value }))}
                        placeholder="Help us improve by sharing your reason for cancellation"
                        rows={3}
                    />
                </div>
            </div>

            <DialogFooter className='bg-transparent sm:justify-between'>
                <DialogClose asChild>
                    <Button variant="foreground" size="sm" className='border-foreground/10' disabled={loading}>
                        Don't cancel
                    </Button>
                </DialogClose>
                <Button variant="continue" size="sm" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        </>
                    ) : (
                        'Cancel Subscription'
                    )}
                </Button>
            </DialogFooter>
        </div>
    )
}


