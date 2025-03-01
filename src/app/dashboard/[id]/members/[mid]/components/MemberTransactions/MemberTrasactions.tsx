'use client'
import {
    Badge,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui'
import { Input } from '@/components/forms'
import { cn, formatAmountForDisplay } from '@/libs/utils'
import MemberPaymentActions from './actions'
// import NewMemberTransaction from './CreateTransaction'
import { useMemberTransactions } from '@/hooks/hooks'
import { useMember } from '../../providers/MemberContext'

import { format } from 'date-fns'
import { Transaction } from '@/types/transaction'

export function MemberTransactions({ params }: { params: { id: string, mid: number } }) {
    const { member } = useMember();
    const { transactions, error, isLoading } = useMemberTransactions(params.id, params.mid);
    return (
        <div className='py-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search transactions...' className='w-[250px] text-xs h-8 py-2 rounded-xs' />
                </div>
                <div>

                </div>
            </div>
            <div className='border rounded-sm mt-4'>
                <Table className=''>
                    <TableHeader>
                        <TableRow>
                            {["Amount", "Description", "Payment Method", "Date", ""].map((header, index) => (
                                <TableHead key={index} className='text-xs h-auto py-2'>
                                    {header}
                                </TableHead>
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
                                {transactions && transactions.map((t: Transaction) => (
                                    <TableRow key={t.id}>

                                        <TableCell>
                                            <div className='flex flex-row items-center gap-2'>
                                                <span className='font-bold'>{formatAmountForDisplay(t.amount / 100, t.currency, true)}</span>
                                                <span className='uppercase'>{t.currency}</span>
                                                {t.refunded ? (
                                                    <Badge roles='red' size={"tiny"}>Refunded</Badge>
                                                ) : (
                                                    <Badge transaction={t.status} size={"tiny"}>
                                                        {t.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {t.description}
                                        </TableCell>
                                        <TableCell>
                                            {(t.paymentMethod === 'card' && t.metadata?.card) ? (
                                                <div className='flex flex-row items-center gap-1'>
                                                    <span className='capitalize'>
                                                        {t.metadata?.card.brand}
                                                    </span>
                                                    <span>
                                                        •••• {t.metadata?.card.last4}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='capitalize'>
                                                    {t.paymentMethod}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {format(t.created!, 'MMM d, yyyy')}
                                        </TableCell>

                                        <TableCell className='flex flex-row items-center'>
                                            <MemberPaymentActions transaction={t} memberId={params.mid} locationId={params.id} />
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

