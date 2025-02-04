'use client'
import {
    Button,
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
import Stripe from 'stripe';
import { cva } from 'class-variance-authority';
import { Clock4Icon } from 'lucide-react';
import { CreateEnrollment } from './create-enrollment'
import { useMemberSubscriptions } from '@/hooks/use-members'
import { useMember } from '../../providers/MemberContext'




function calculateProgressPercentage(start: number, end: number) {
    const currentDate: Date = new Date();
    const startDate = new Date(start * 1000);
    const endDate = new Date(end * 1000);
    const totalDuration: number = endDate.getTime() - startDate.getTime();
    const elapsedTime: number = currentDate.getTime() - startDate.getTime();
    const progressPercentage: number = (elapsedTime / totalDuration) * 100;
    // Return the result, limited to 2 decimal places
    return Math.min(Math.max(parseFloat(progressPercentage.toFixed(2)), 0), 100);
}

export function MemberEnrollments({ params }: { params: { id: string, mid: number }, }) {
    const { member } = useMember();
    const { subscriptions, isLoading, error } = useMemberSubscriptions(params.id, params.mid, member.stripeCustomerId);

    return (
        <div className='py-4'>
            <div className='w-full flex flex-row items-center  gap-2'>
                <div className='flex-initial'>
                    <Input placeholder='Search enrollments...' className='w-[250px] h-auto py-1  text-xs rounded-xs' />
                </div>
                <div>
                    <CreateEnrollment />
                </div>
            </div>
            <div className='border rounded-xs mt-4'>
                <Table className=''>
                    <TableHeader>
                        <TableRow >
                            {['Plan', 'Length', 'Amount', 'Total Collected', 'Next Invoice', 'Status', ''].map((header, i) => (

                                <TableHead key={i} className='text-sm h-auto  py-2'>{header}</TableHead>

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

function SubscriptionRow({ subscriptions }: { subscriptions: Stripe.Subscription[] }) {

    if (subscriptions.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={6} className='text-center'>
                    <p className='text-sm text-gray-500'>No enrollments found</p>
                </TableCell>
            </TableRow>
        )
    }

    return (

        <>

            {subscriptions.map((enrollment: any) => (
                <TableRow key={enrollment.id}>

                    <TableCell>
                        <div className='flex flex-row gap-2 items-center'>
                            <div className="relative flex items-center justify-center w-5 h-5">
                                <CircleProgress progress={calculateProgressPercentage(enrollment.current_period_start, enrollment.current_period_end)} />
                            </div>
                            <span>{enrollment.items.data[0].plan.nickname}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {formatDateTime(enrollment.created * 1000)} - {enrollment.ended_at ? formatDateTime(enrollment.ended_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                        {formatAmountForDisplay(enrollment.items.data[0].plan.amount / 100, enrollment.currency, true)} / {enrollment.items.data[0].plan.interval}
                    </TableCell>
                    <TableCell>
                    </TableCell>
                    <TableCell>
                        {(enrollment.status !== 'active' || enrollment.cancel_at) ? (
                            "No future invoices"
                        ) : (
                            formatDateTime(enrollment.current_period_end, {
                                month: 'short',
                                day: 'numeric',
                            })
                        )}
                    </TableCell>
                    <TableCell>
                        <EnrollmentStatusComponent enrollment={enrollment} />
                    </TableCell>
                    <TableCell className='flex flex-row items-center'>
                        <MemberEnrollmentActions />
                    </TableCell>
                </TableRow>
            ))}
        </>
    )
}


const EnrollmentStatusVarients = cva(
    "py-0.5 px-2 rounded-sm capitalize text-xs font-medium",
    {
        variants: {
            status: {
                default: "bg-gray-300  text-gray-800",
                active: "bg-green-300  text-green-800",
                inactive: "bg-red-300  text-red-800",
                unpaid: "bg-red-300  text-red-800",
                trialing: "bg-blue-300  text-blue-800",
            }
        },
        defaultVariants: {
            status: "default",
        },
    }
)

function EnrollmentStatusComponent({ enrollment }: { enrollment: Stripe.Subscription }) {
    const DateFormat: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
    }
    if (enrollment.status === 'active') {
        return (
            <>
                {enrollment.cancel_at || enrollment.cancel_at_period_end ? (
                    <div className='flex flex-row items-center gap-2'>
                        <span className={cn(EnrollmentStatusVarients({ status: enrollment.status }))}> {enrollment.status} </span>
                        <span className={cn(EnrollmentStatusVarients(), "flex flex-row items-center gap-1")}>
                            Cancels {" "}
                            {formatDateTime((enrollment.cancel_at || 0) * 1000, DateFormat)}
                            <Clock4Icon size={13} />
                        </span>
                    </div>
                ) : (
                    <span className={cn(EnrollmentStatusVarients({ status: enrollment.status }))}> {enrollment.status} </span>
                )}
            </>
        )
    }

    if (enrollment.trial_end) {
        return (
            <span className={cn(EnrollmentStatusVarients({ status: "trialing" }))}>Trail ends {formatDateTime(enrollment.trial_end * 1000, DateFormat)} </span>
        )
    }

    return (
        <span className={cn(EnrollmentStatusVarients())}> {enrollment.status}</span>
    )

}