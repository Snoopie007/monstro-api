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
import MemberEnrollmentActions from './actions'
import { CircleProgress } from '@/components/ui/circle-progress';
import { cva } from 'class-variance-authority';
import { Clock4Icon } from 'lucide-react';
import { CreateEnrollment } from './CreateSubscription'
import { useMemberSubscriptions } from '@/hooks/use-members'
import { MemberSubscription } from '@/types'



function toUTC(date: Date) {
    if (!date) 0
    return Math.floor(new Date(date).getTime());
}

function calculateProgress(start: number, end: number) {
    const currentDate: Date = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const totalDuration: number = endDate.getTime() - startDate.getTime();
    const elapsedTime: number = currentDate.getTime() - startDate.getTime();
    const progressPercentage: number = (elapsedTime / totalDuration) * 100;
    // Return the result, limited to 2 decimal places
    return Math.min(Math.max(parseFloat(progressPercentage.toFixed(2)), 0), 100);
}

export function MemberSubs({ params }: { params: { id: string, mid: number }, }) {
    const { subscriptions, isLoading, error } = useMemberSubscriptions(params.id, params.mid);

    return (
        <div className='py-4 space-y-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search enrollments...' className='w-[250px] h-auto py-1  text-xs rounded-xs' />
                </div>
                <div>
                    <CreateEnrollment />
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
                        {isLoading ? (
                            <>
                                <TableRow >
                                    {Array.from({ length: 6 }).map((_, i) => {
                                        return (
                                            <TableCell key={i}>
                                                <Skeleton className="w-full h-4 bg-gray-100" />
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            </>
                        ) : (
                            <SubscriptionRow subscriptions={subscriptions} />
                        )}
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
                                <CircleProgress progress={calculateProgress(toUTC(sub.currentPeriodStart), toUTC(sub.currentPeriodEnd))} />
                            </div>
                            <span>{sub.plan?.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {formatDateTime(toUTC(sub.activationDate))} - {sub.endedAt ? formatDateTime(toUTC(sub.endedAt)) : 'Never'}
                    </TableCell>
                    <TableCell>
                        {formatAmountForDisplay(sub.plan?.pricing.amount! / 100, 'USD', true)} / {sub.plan?.pricing.billingPeriod}
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                        {(sub.status !== 'active' || sub.cancelAt) ? (
                            "No future invoices"
                        ) : (
                            formatDateTime(toUTC(sub.currentPeriodEnd), {
                                month: 'short',
                                day: 'numeric',
                            })
                        )}
                    </TableCell>
                    <TableCell>
                        <SubscriptionStatus sub={sub} />
                    </TableCell>
                    <TableCell className='flex flex-row items-center'>
                        <MemberEnrollmentActions />
                    </TableCell>
                </TableRow>
            ))}
        </>
    )
}


const SubsStatusVarients = cva("py-0.5 px-2 rounded-sm capitalize text-xs font-medium",
    {
        variants: {
            status: {
                active: "bg-green-300  text-green-800",
                inactive: "bg-red-300  text-red-800",
                unpaid: "bg-red-300  text-red-800",
                trialing: "bg-blue-300  text-blue-800",
                past_due: "bg-red-300  text-red-800",
            }
        }
    }
)

function SubscriptionStatus({ sub }: { sub: MemberSubscription }) {
    const DateFormat: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
    }
    if (sub.status === 'active') {
        return (
            <>
                {sub.cancelAt && sub.cancelAtPeriodEnd ? (
                    <div className='flex flex-row items-center gap-2'>
                        <span className={cn(SubsStatusVarients({ status: `${sub.status}` }))}> {sub.status} </span>
                        <span className={cn(SubsStatusVarients(), "flex flex-row items-center gap-1")}>
                            Cancels {" "}
                            {formatDateTime((toUTC(sub.cancelAt) || 0), DateFormat)}
                            <Clock4Icon size={13} />
                        </span>
                    </div>
                ) : (
                    <span className={cn(SubsStatusVarients({ status: sub.status }))}> {sub.status} </span>
                )}
            </>
        )
    }

    if (sub.trialEnd) {
        return (
            <span className={cn(SubsStatusVarients({ status: "trialing" }))}>Trail ends {formatDateTime(toUTC(sub.trialEnd), DateFormat)} </span>
        )
    }

    return (
        <span className={cn(SubsStatusVarients())}> {sub.status}</span>
    )

}