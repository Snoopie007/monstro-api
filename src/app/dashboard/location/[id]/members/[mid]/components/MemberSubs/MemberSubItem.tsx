'use client'

import { CircleProgress } from '@/components/ui'
import { useState } from 'react'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberSubscription } from '@/types'
import { format } from 'date-fns'
import { SubActions } from './SubActions'

function calculateProgress(start: Date, end: Date) {
    const now = Date.now()
    const startDate = new Date(start)
    const endDate = new Date(end)
    const total = endDate.getTime() - startDate.getTime()
    const elapsed = now - startDate.getTime()
    const progress = (elapsed / total) * 100

    return Math.min(Math.max(Number(progress.toFixed(2)), 10), 100)
}

export function MemberSubItem({ sub }: { sub: MemberSubscription }) {

    return (
        <div className="bg-muted/50 rounded-lg px-4 py-3 space-y-2">
            <div className="flex flex-row justify-between items-center">
                <div className="font-medium flex items-center gap-1.5">
                    <div className="relative size-5">
                        <CircleProgress
                            progress={calculateProgress(
                                sub.currentPeriodStart,
                                sub.currentPeriodEnd
                            )}
                        />
                    </div>
                    <span className="font-bold text-sm">
                        {sub.plan?.name}
                    </span>

                </div>
                <div>
                    <SubActions sub={sub} refetch={() => { }} />
                </div>
            </div>
            <div className="space-y-4 py-2">
                <div className="flex flex-row justify-between items-center">
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Duration</div>
                        <span className="text-sm font-medium">
                            {format(sub.startDate, 'MMM d, yyyy')} {' - '}
                            {sub.endedAt ? format(sub.endedAt, 'MMM d, yyyy')
                                : 'n/a'}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Price</div>
                        <span className="text-sm font-medium">
                            {formatAmountForDisplay(sub.plan?.price! / 100, 'usd', true)}
                            / {sub.plan?.interval}

                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Total Collected</div>
                        <span className="text-sm font-medium">

                        </span>
                    </div>
                </div>
                <div className="flex flex-row justify-between items-center">
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Payment Method</div>
                        <span className="text-sm font-medium">
                            {sub.paymentMethod}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Next Billing Date</div>
                        <span className="text-sm font-medium">
                            {format(sub.currentPeriodEnd, 'MMM d, yyyy')}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Status</div>
                        <span className="text-sm font-medium flex items-center gap-2 capitalize">
                            <StatusDot status={sub.status} /> {sub.status}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    )
}
function StatusDot({ status }: { status: string }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500'
            case 'paused':
                return 'bg-yellow-500'
            case 'canceled':
                return 'bg-red-500'
            case 'incomplete':
                return 'bg-orange-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className={`size-2.5 rounded-full ${getStatusColor(status)}`} />
    )
}