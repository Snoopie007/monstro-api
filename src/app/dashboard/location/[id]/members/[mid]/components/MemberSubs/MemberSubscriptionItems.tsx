'use client'

import { ScrollArea, Skeleton, CircleProgress } from '@/components/ui'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from '@/components/ui/item'
import { useMemberExistingSubscriptions } from '@/hooks'
import { formatAmountForDisplay } from '@/libs/utils'
import { MemberSubscription } from '@/types'
import { format } from 'date-fns'
import { useState } from 'react'
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

export const MemberSubscriptionItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const { existingSubscriptions, isLoading, fetchSubs } =
        useMemberExistingSubscriptions(params.id, params.mid)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
            </div>
        )
    }

    const renderSubscriptions = () => {
        return existingSubscriptions && existingSubscriptions.length > 0 ? (
            existingSubscriptions.map((sub: MemberSubscription) => (
                <li key={sub.id}>
                    <Item
                        variant="muted"
                        className="hover:bg-muted-foreground/5"
                    >
                        <ItemMedia>
                            <div className="relative flex items-center justify-center w-6 h-6">
                                <CircleProgress
                                    progress={calculateProgress(
                                        sub.currentPeriodStart,
                                        sub.currentPeriodEnd
                                    )}
                                />
                            </div>
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>
                                {sub.plan?.name}
                                {' • '}
                                <span className="text-muted-foreground text-xs">
                                    {format(sub.startDate, 'MMM d, yyyy')} -{' '}
                                    {sub.endedAt
                                        ? format(sub.endedAt, 'MMM d, yyyy')
                                        : 'Never'}
                                </span>
                            </ItemTitle>
                            <ItemDescription>
                                <div className="flex items-center justify-between gap-2">
                                    <span>
                                        {formatAmountForDisplay(
                                            sub.plan?.price! / 100,
                                            'USD',
                                            true
                                        )}{' '}
                                        / {sub.plan?.interval} •{' '}
                                        {sub.paymentMethod.toUpperCase()}
                                    </span>
                                </div>
                            </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                            <SubActions sub={sub} refetch={fetchSubs} />
                        </ItemActions>
                    </Item>
                </li>
            ))
        ) : (
            <li>
                <Item variant="muted" className="hover:bg-muted-foreground/5">
                    <ItemContent>
                        <ItemTitle>No subscriptions found</ItemTitle>
                    </ItemContent>
                </Item>
            </li>
        )
    }

    return (
        <div className="mb-4">
            <ScrollArea className="max-h-[350px] w-full">
                <ul className="flex flex-col gap-2">{renderSubscriptions()}</ul>
            </ScrollArea>
        </div>
    )
}
