'use client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    CircleProgress
} from '@/components/ui'
import { Input } from '@/components/forms'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberSubscription } from '@/types'
import { useMemberStatus } from '../../providers'
import { SubscriptionStatus, CreateSubscription, SubActions } from '.'
import { getUnixTime, format } from 'date-fns'
import { useState } from 'react'



function calculateProgress(start: number, end: number) {
    const currentDate: Date = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDuration: number = endDate.getTime() - startDate.getTime();
    const elapsedTime: number = currentDate.getTime() - startDate.getTime();
    const progressPercentage: number = (elapsedTime / totalDuration) * 100;
    return Math.min(Math.max(parseFloat(progressPercentage.toFixed(2)), 0), 100);
}

export function MemberSubs({ params }: { params: { id: string, mid: string }, }) {
    const { member } = useMemberStatus();
    const [search, setSearch] = useState<string>('');

    return (
        <div className='space-y-0'>
            <div className='w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2'>
                <Input placeholder='Search subs...' className='w-auto bg-background border-foreground/10 h-9' />
                <CreateSubscription params={params} />
            </div>
            <div className='border-y border-foreground/10'>
                <Table className=''>
                    <TableHeader>
                        <TableRow >
                            {['Plan', 'Length', 'Amount', 'Total Collected', 'Next Invoice', 'Status', ''].map((header, i) => (

                                <TableHead key={i} className='text-sm font-normal h-auto  py-2'>{header}</TableHead>

                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <SubscriptionRow subscriptions={member?.subscriptions || []} />
                    </TableBody>
                </Table>
            </div>
        </div >
    )
}

function SubscriptionRow({ subscriptions }: { subscriptions: MemberSubscription[] }) {

    if (subscriptions.length < 1) {
        return (
            <TableRow>
                <TableCell colSpan={6} className='text-center'>
                    <p className='text-sm text-gray-500'>No subscriptions found</p>
                </TableCell>
            </TableRow>
        )
    }

    return (

        <>
            {subscriptions.map((sub: MemberSubscription) => (
                <TableRow key={sub.id} className='group '>

                    <TableCell>
                        <div className='flex flex-row items-center justify-between'>
                            <div className='flex flex-row gap-2 items-center'>
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <CircleProgress progress={calculateProgress(
                                        getUnixTime(Number(sub.currentPeriodStart) * 1000), getUnixTime(Number(sub.currentPeriodEnd) * 1000)
                                    )} />
                                </div>
                                <span>{sub.plan?.name}</span>
                            </div>
                            <SubActions sub={sub} />
                        </div>
                    </TableCell>
                    <TableCell>
                        {format(sub.startDate, "MMM d, yyyy")} - {sub.endedAt ? format(sub.endedAt, "MMM d, yyyy") : 'Never'}
                    </TableCell>
                    <TableCell>
                        {formatAmountForDisplay(sub.plan?.price! / 100, 'USD', true)} / {sub.plan?.interval}
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                        {(sub.status !== 'active' || sub.cancelAt) ? (
                            "No future invoices"
                        ) : (
                            format(sub.currentPeriodEnd, "MMM d, yyyy")
                        )}
                    </TableCell>
                    <TableCell>
                        <SubscriptionStatus sub={sub} />
                    </TableCell>

                </TableRow>
            ))}
        </>
    )
}
