"use client"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/forms'
import {

    Button,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogClose
} from '@/components/ui'
import { cn, formatAmountForDisplay, sleep, tryCatch } from '@/libs/utils'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import Stripe from 'stripe'
import React from 'react'
import { toast } from 'react-toastify'


interface RetryPaymentProps {
    subscription: Record<string, any>
    invoiceId: string | Stripe.Invoice | null
    paymentMethods: Stripe.PaymentMethod[]
    lid: string
}

export function RetryPayment({ subscription, invoiceId, paymentMethods, lid }: RetryPaymentProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

    async function retry() {
        if (!paymentMethod) return
        setLoading(true)
        await sleep(1000)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/vendor/billing/retry`, {
                method: "POST",
                body: JSON.stringify({ invoiceId, paymentMethod })
            })
        )
        if (error) {
            toast.error("Failed to retry payment.")
        }
        setLoading(false)
        setOpen(false)
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger >
                <div className='text-sm font-medium flex items-center text-red-500 cursor-pointer '>

                    Retry
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Retry Payment</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-1'>
                            <span className='text-sm font-medium text-[0.8rem]'>Amount due</span>
                            <span className='text-sm '>{formatAmountForDisplay((subscription.amount / 100), subscription.currency, true)}</span>
                        </div>
                        <div className='flex flex-col gap-1'>
                            <span className='text-sm font-medium text-[0.8rem]'>Payment method</span>
                            <Select onValueChange={setPaymentMethod}  >

                                <SelectTrigger>
                                    <SelectValue placeholder="Select a payment method" className='rounded-sm' />

                                </SelectTrigger>

                                <SelectContent>
                                    {paymentMethods.map((method, index) => (
                                        <React.Fragment key={index}>
                                            {method.card ? (
                                                <SelectItem value={method.id} className="w-full cursor-pointer">
                                                    <div className="flex flex-row items-center justify-between gap-4">
                                                        <div className="flex flex-row items-center gap-2">
                                                            <img src={`/images/cards/${method.card.brand}.svg`} alt={method.card.brand} className="h-7 w-7" />

                                                            <span className="text-sm capitalize">{method.card.brand} •••• {method.card.last4}</span>
                                                        </div>
                                                        <span className="text-sm">{method.card.exp_month} / {method.card.exp_year}</span>
                                                    </div>
                                                </SelectItem>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"outline"} size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <Button variant={"continue"} size={"sm"}
                        className={cn('children:hidden', loading && 'children:block')}
                        disabled={loading || !paymentMethod}
                        onClick={retry}>
                        <Loader2 size={14} className='animate-spin mr-1' />
                        Retry

                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}



