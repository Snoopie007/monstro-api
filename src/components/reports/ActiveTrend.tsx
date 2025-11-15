'use client'

import { cn } from '@/libs/utils'
import {
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Skeleton,
} from '@/components/ui'
import { MemberLocation } from '@/types'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
interface ActiveTrendProps {
    mls: MemberLocation[]
    lid?: string
}

type Trend = {
    value: number
    previous: number
    change: string
    changeType: '+' | '-' | '~'
}

const DummyData = {
    current: 245,
    previous: 232,
}

export function ActiveTrend({ mls, lid }: ActiveTrendProps) {
    const [loading, setLoading] = useState(true)

    const trend = useMemo<Trend>(() => {
        if (lid === 'acc_BpT7jEb3Q16nOPL3vo7qlw') {
            const { current, previous } = DummyData
            const change =
                previous === 0
                    ? current > 0
                        ? 100
                        : 0
                    : ((current - previous) / previous) * 100

            return {
                value: current,
                previous: previous,
                change: `${Math.abs(change).toFixed(1)}%`,
                changeType: change === 0 ? '~' : change > 0 ? '+' : '-',
            }
        }

        const now = new Date()
        const lastMonth = subMonths(now, 1)

        const countActiveIn = (targetDate: Date) =>
            mls.filter((ml) => {
                if (ml.status !== 'active') return false

                // If member was created after the target month, they weren't active then
                if (ml.created && new Date(ml.created) > targetDate)
                    return false

                // If member was created in or before the target month, they were active
                return true
            }).length

        const current = mls.filter((ml) => ml.status === 'active').length
        const previous = countActiveIn(lastMonth)
        const change =
            previous === 0
                ? current > 0
                    ? 100
                    : 0
                : ((current - previous) / previous) * 100

        return {
            value: current,
            previous: previous,
            change: `${Math.abs(change).toFixed(1)}%`,
            changeType: change === 0 ? '~' : change > 0 ? '+' : '-',
        }
    }, [mls, lid])

    useEffect(() => {
        if (mls) {
            setLoading(false)
        }
    }, [mls])

    return (
        <Card className="bg-foreground/5 rounded-lg border-foreground/10 p-0">
            <CardHeader className="grid space-y-0 auto-rows-min grid-rows-[auto_auto] items-center gap-1.5 px-6">
                <CardDescription>Active Members</CardDescription>
                <CardTitle className="text-3xl font-bold">
                    {loading ? (
                        <Skeleton className="bg-foreground/10 w-24 h-8" />
                    ) : (
                        trend.value
                    )}
                </CardTitle>
                <div
                    className={cn(
                        'col-start-2 row-span-2 row-start-1 self-start justify-self-end'
                    )}
                >
                    {loading ? (
                        <Skeleton className="bg-foreground/10 w-14 h-4" />
                    ) : (
                        <Badge
                            size="small"
                            className="rounded-md border border-foreground/10 text-[0.7rem] flex items-center gap-1"
                        >
                            {trend.changeType === '+' ? (
                                <TrendingUp className="size-3 text-green-500" />
                            ) : trend.changeType === '-' ? (
                                <TrendingDown className="size-3 text-red-500" />
                            ) : null}
                            <span>
                                {trend.changeType === '~'
                                    ? ''
                                    : trend.changeType}
                                {trend.change}
                            </span>
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="bg-foreground/10 w-full h-5" />
                ) : (
                    <div>
                        <p className="text-sm font-semibold">
                            {trend.changeType === '~'
                                ? 'No change'
                                : `Trending ${
                                      trend.changeType === '+' ? 'up' : 'down'
                                  } ${trend.change}`}
                        </p>
                        <p className="text-xs text-foreground/50">
                            Previous: {trend.previous} active members
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
