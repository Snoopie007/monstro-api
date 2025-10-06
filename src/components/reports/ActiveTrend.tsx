"use client"

import { cn } from '@/components/event-calendar/utils'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui'
import { MemberLocation } from '@/types'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isSameMonth, isSameYear, subMonths } from 'date-fns'
interface ActiveTrendProps {
    mls: MemberLocation[]
}

type Trend = {
    value: number
    change: string
    changeType: 'positive' | 'negative'
}

export function ActiveTrend({ mls }: ActiveTrendProps) {
    const [loading, setLoading] = useState(true)

    const trend = useMemo<Trend>(() => {
        const now = new Date()
        const lastMonth = subMonths(now, 1)

        const isActiveIn = (targetDate: Date) =>
            mls.filter((ml) => {
                if (ml.status !== 'active' || !ml.created) return false
                const d = new Date(ml.created as Date)
                return isSameMonth(d, targetDate) && isSameYear(d, targetDate)
            }).length

        const current = isActiveIn(now)
        const previous = isActiveIn(lastMonth)
        const changePct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100

        return {
            value: current,
            change: `${Math.abs(changePct).toFixed(1)}%`,
            changeType: changePct >= 0 ? 'positive' : 'negative',
        }
    }, [mls])

    useEffect(() => {
        if (mls) {
            setLoading(false)
        }
    }, [mls])

    return (
        <Card className='bg-foreground/5 rounded-lg border-foreground/10 p-0'>
            <CardHeader className='grid space-y-0 auto-rows-min grid-rows-[auto_auto] items-center gap-1.5 px-6'>
                <CardDescription>Active Memberships</CardDescription>
                <CardTitle className='text-3xl font-bold'>
                    {loading ? (
                        <Skeleton className='bg-foreground/10 w-24 h-8' />
                    ) :
                        trend.value
                    }
                </CardTitle>
                <div className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end')}>
                    {loading ? (
                        <Skeleton className='bg-foreground/10 w-14 h-4' />
                    ) : (
                        <Badge size='small' className='rounded-md border border-foreground/10 text-[0.7rem] flex items-center gap-1'>
                            {trend.changeType === 'positive' ? (
                                <TrendingUp className='size-3 text-green-500' />
                            ) : (
                                <TrendingDown className='size-3 text-red-500' />
                            )}
                            <span>{trend.changeType === 'positive' ? '+' : '-'}{trend.change}</span>
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className='bg-foreground/10 w-full h-5' />
                ) : (
                    <p className='font-bold'>
                        Trending {trend.changeType === 'positive' ? 'up' : 'down'} {trend.change}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
