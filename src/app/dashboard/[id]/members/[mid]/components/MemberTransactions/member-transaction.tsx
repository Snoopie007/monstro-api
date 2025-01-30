'use client'
import {
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui'
import { Input } from '@/components/forms'
import { cn, formatAmountForDisplay, formatDateTime } from '@/libs/utils'
import MemberPaymentActions from './actions'
import NewMemberTransaction from './create-transaction'
import { useMemberPayments } from '@/hooks/use-members'
import { useMember } from '../../providers/MemberContext'
import Stripe from 'stripe'

export function MemberTransactions({ params }: { params: { id: string, mid: number } }) {
    const { member } = useMember();
    const { payments, error, isLoading } = useMemberPayments(params.id, params.mid, member.stripeCustomerId);
    return (
        <div className='py-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search transactions...' className='w-[250px] text-xs h-auto py-1 rounded-xs' />
                </div>
                <div>
                    <NewMemberTransaction />
                </div>
            </div>
            <div className='border rounded-sm mt-4'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {["Amount", "Description", "Payment Method", "Date", ""].map((header, index) => (
                                <TableHead key={index} className='text-xs h-auto py-2'>{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <>
                                <TableRow >
                                    {Array.from({ length: 4 }).map((_, i) => {
                                        return (
                                            <TableCell key={i}>
                                                <Skeleton className="w-full h-4 bg-gray-100" />
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            </>
                        ) : (
                            <>
                                {payments.map((payment: Stripe.Charge) => (
                                    <TableRow key={payment.id}>

                                        <TableCell>
                                            <ChargeAmount amount={payment.amount} currency={payment.currency} status={payment.status} refunded={payment.refunded} />
                                        </TableCell>
                                        <TableCell>
                                            {payment.description == null ? "Payment for membership" : payment.description}
                                        </TableCell>
                                        <TableCell>
                                            {payment.payment_method_details?.type === 'card' && (
                                                <div className='flex flex-row items-center gap-1'>
                                                    <span className='capitalize'>
                                                        {payment.payment_method_details.card?.brand}
                                                    </span>
                                                    <span>
                                                        •••• {payment.payment_method_details.card?.last4}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {formatDateTime(payment.created, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: 'numeric'
                                            })}
                                        </TableCell>

                                        <TableCell className='flex flex-row items-center'>
                                            <MemberPaymentActions payment={payment} memberId={params.mid} locationId={params.id} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                    </TableBody>
                </Table>
            </div>
        </div>
    )
}


function ChargeAmount({ amount, currency, status, refunded }: { amount: number, currency: string, status: string, refunded: boolean }) {
    return (
        <div className='flex flex-row items-center gap-2'>
            <span className='font-bold inline-block leading-5 align-middle'>{formatAmountForDisplay(amount / 100, currency, true)}</span>
            <span className='uppercase  inline-block leading-5 align-middle'>{currency}</span>
            <span className={cn("capitalize text-xs leading-5 inline-block font-medium px-2 rounded-sm", {
                'bg-green-300 text-green-800': status === 'succeeded',
                'bg-red-300 text-red-800': status === 'failed',
                'bg-yellow-300 text-yellow-800': status === 'pending',
            })} data-state={status}>
                {status === 'succeeded' ? 'Paid' : status}

            </span>
            <span className={cn("capitalize text-xs leading-5 inline-block font-medium px-2 rounded-sm", {
                'bg-red-300 text-red-800': refunded === true,
            })} data-state={status}>
                {refunded ? 'Refunded' : ''}
            </span>
        </div>
    )
}
