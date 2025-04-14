'use client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui'
import { Input } from '@/components/forms'
import { formatAmountForDisplay } from '@/libs/utils'
import MemberSubscriptionActions from './actions'
import { CircleProgress } from '@/components/ui/circle-progress';

import { CreateSubscription } from './CreateSub/CreateSubscription'
import { MemberSubscription } from '@/types'
import { useMemberStatus } from '../../providers/MemberContext'
import { SubscriptionStatus } from './SubscriptionStatus'
import { getUnixTime, format } from 'date-fns'

function calculateProgress(start: number, end: number) {
    const currentDate: Date = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDuration: number = endDate.getTime() - startDate.getTime();
    const elapsedTime: number = currentDate.getTime() - startDate.getTime();
    const progressPercentage: number = (elapsedTime / totalDuration) * 100;
    return Math.min(Math.max(parseFloat(progressPercentage.toFixed(2)), 0), 100);
}

export function MemberSubs({ params }: { params: { id: string, mid: number }, }) {
    const { member } = useMemberStatus();
    return (
        <div className='py-4 space-y-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search subs...' className='w-[250px] h-8 py-2  text-xs rounded-sm' />
                </div>
                <div>
                    <CreateSubscription params={params} />
                </div>
            </div>
            <div className='border rounded-sm'>
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
                <TableRow key={sub.id}>

                    <TableCell>
                        <div className='flex flex-row gap-2 items-center'>
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <CircleProgress progress={calculateProgress(
                                    getUnixTime(Number(sub.currentPeriodStart) * 1000), getUnixTime(Number(sub.currentPeriodEnd) * 1000)
                                )} />
                            </div>
                            <span>{sub.plan?.name}</span>
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
                    <TableCell className='flex flex-row items-center'>
                        <MemberSubscriptionActions />
                    </TableCell>
                </TableRow>
            ))}
        </>
    )
}

