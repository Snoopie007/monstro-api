import { Button } from '@/components/ui';
import { Trash2, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useParams } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/forms/radio-group';
import { Label } from '@/components/forms';
import { Input } from '@/components/forms/input';
import { Textarea } from '@/components/forms/textarea';
import { PaymentMethod } from '@/types';
import { format } from 'date-fns';
import { tryCatch } from '@/libs/utils';

interface Subscription {
    id: number;
    status: string;
    currentPeriodEnd: Date;
    paymentMethod: PaymentMethod;
    stripeSubscriptionId?: string | null;
}

export function SubscriptionCancelDialog({ subscription }: { subscription: Subscription }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cancellationOption, setCancellationOption] = useState<'now' | 'period_end' | 'custom_date'>('period_end');
    const [customDate, setCustomDate] = useState<string>('');
    const [refundOption, setRefundOption] = useState<'none' | 'full' | 'partial'>('none');
    const [refundAmount, setRefundAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const params = useParams();


    const today = new Date().toISOString().split('T')[0];
    const periodEndDate = new Date(subscription.currentPeriodEnd).toISOString().split('T')[0];

    const handleSubmit = async () => {
        // Validate inputs first
        if (!subscription?.id || !params?.id || !params?.mid) {
            console.log(subscription.id, params.id, params.mid);
            toast.error('Missing required information');
            return;
        }

        if (cancellationOption === 'custom_date' && !customDate) {
            toast.error('Please select a cancellation date');
            return;
        }

        if (refundOption === 'partial' && (!refundAmount || isNaN(Number(refundAmount)) || Number(refundAmount) <= 0)) {
            toast.error('Please enter a valid refund amount');
            return;
        }

        setLoading(true);

        const requestBody: Record<string, any> = {
            subscriptionId: subscription.id,
            cancellationOption,
            refundOption,
            refundReason: reason || 'requested_by_customer',
        };

        if (cancellationOption === 'custom_date' && customDate) {
            requestBody.customCancelDate = customDate;
        }

        if (refundOption === 'partial' && refundAmount) {
            requestBody.refundAmount = Math.round(Number(refundAmount) * 100);
        }

        if (reason) {
            requestBody.cancellationReason = reason;
        }

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subscriptions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })
        );

        setLoading(false);

        if (error || !result || !result.ok) {
            const errorData = await result?.json().catch(() => ({}));
            toast.error(errorData.error || 'Failed to cancel subscription');
            return;
        }

        toast.success('Subscription cancellation processed');
        setOpen(false);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                disabled={!subscription || subscription.status === 'canceled'}
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Cancellation Options</h4>
                                <RadioGroup
                                    value={cancellationOption}
                                    onValueChange={(value: 'now' | 'period_end' | 'custom_date') =>
                                        setCancellationOption(value)
                                    }
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="now" id="now" />
                                        <Label htmlFor="now">Cancel Immediately</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="period_end" id="period_end" />
                                        <Label htmlFor="period_end">
                                            Cancel at End of Billing Period (
                                            {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')})
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="custom_date" id="custom_date" />
                                        <Label htmlFor="custom_date">Cancel on Specific Date</Label>
                                    </div>
                                </RadioGroup>

                                {cancellationOption === 'custom_date' && (
                                    <div className="ml-6 mt-2 space-y-1">
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            min={today}
                                            max={periodEndDate}
                                            className="w-full p-2 border rounded-md"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Must be between {today} and {periodEndDate}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {subscription.paymentMethod === 'card' && (
                                <div className="space-y-2">
                                    <h4 className="font-medium">Refund Options</h4>
                                    <RadioGroup
                                        value={refundOption}
                                        onValueChange={(value: 'none' | 'full' | 'partial') => setRefundOption(value)}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="none" id="refund_none" />
                                            <Label htmlFor="refund_none">No Refund</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="full" id="refund_full" />
                                            <Label htmlFor="refund_full">Full Refund</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="partial" id="refund_partial" />
                                            <Label htmlFor="refund_partial">Partial Refund</Label>
                                        </div>
                                    </RadioGroup>

                                    {refundOption === 'partial' && (
                                        <div className="ml-6 mt-2 space-y-1">
                                            <div className="flex items-center">
                                                <span className="mr-2">$</span>
                                                <Input
                                                    type="number"
                                                    value={refundAmount}
                                                    onChange={(e) => setRefundAmount(e.target.value)}
                                                    placeholder="Enter amount"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Enter the amount to refund</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Help us improve by sharing your reason for cancellation"
                                    rows={3}
                                />
                            </div>

                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm text-yellow-800">
                                    {cancellationOption === 'now'
                                        ? 'The subscription will be cancelled immediately with no further charges.'
                                        : cancellationOption === 'period_end'
                                            ? 'The subscription will remain active until the end of the current billing period.'
                                            : 'The subscription will be cancelled on the selected date.'}
                                </p>
                                {refundOption !== 'none' && (
                                    <p className="text-sm text-yellow-800 mt-2">
                                        {refundOption === 'full'
                                            ? 'A full refund will be processed.'
                                            : `A partial refund of $${refundAmount || '0'} will be processed.`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Go Back
                        </Button>
                        <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Confirm Cancellation'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}


{/* <DropdownMenuItem
className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
onClick={onCancel}
disabled={!subscription}
>
<span className='text-xs'> Update</span>
<Pencil className='size-3' />
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem
className='cursor-pointer text-sm flex flex-row items-center justify-between gap-2'
onClick={onCancel}
disabled={!subscription}
>
<span className='text-xs'> Cancel</span>
<Trash2 className='size-3' />
</DropdownMenuItem> */}