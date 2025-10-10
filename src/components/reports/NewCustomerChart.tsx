'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { MemberLocation } from '@/types/member'
import { MONTHS } from '@/libs/data'
import { Loader2 } from 'lucide-react'

const chartConfig = {
    desktop: {
        label: 'Customers',
        color: '#2563eb',
    },
}

type Data = {
    month: string
    count: number
}

const DummyData: Data[] = [
    { month: 'January', count: 12 },
    { month: 'February', count: 18 },
    { month: 'March', count: 25 },
    { month: 'April', count: 22 },
    { month: 'May', count: 30 },
    { month: 'June', count: 28 },
    { month: 'July', count: 35 },
    { month: 'August', count: 32 },
    { month: 'September', count: 27 },
    { month: 'October', count: 40 },
    { month: 'November', count: 38 },
    { month: 'December', count: 45 },
]

export function NewCustomerChart({
    mls,
    lid,
}: {
    mls: MemberLocation[]
    lid: string
}) {
    const [isLoading, setIsLoading] = useState(true)

    const data = useMemo<Data[]>(() => {
        if (lid === 'acc_BpT7jEb3Q16nOPL3vo7qlw') {
            return DummyData
        }
        if (mls) {
            const counts = Object.fromEntries(MONTHS.map((month) => [month, 0]))

            mls.forEach((ml) => {
                if (ml.created) {
                    const date = new Date(ml.created)
                    const monthIndex = date.getMonth()
                    const month = MONTHS[monthIndex]
                    counts[month]++
                }
            })

            return MONTHS.map((month) => ({ month, count: counts[month] }))
        }
        return []
    }, [mls])

    useEffect(() => {
        if (mls) {
            setIsLoading(false)
        }
    }, [mls])

    const maxCustomers = useMemo(() => {
        if (!data) return 0
        return Math.max(...data.map((d: Data) => d.count))
    }, [data])

    return (
        <Card className="bg-foreground/5 rounded-lg border-foreground/10 p-0">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                    New Customers
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 relative">
                {isLoading ? (
                    <div className="flex flex-row gap-2 items-center justify-center h-[450px]">
                        <Loader2 className="animate-spin" size={16} /> Loading
                        data...
                    </div>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="w-full h-[450px]"
                    >
                        <LineChart
                            accessibilityLayer
                            data={data}
                            margin={{
                                left: 20,
                                right: 20,
                                top: 20,
                                bottom: 20,
                            }}
                        >
                            <CartesianGrid
                                vertical={false}
                                horizontal={false}
                            />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={true}
                                tickFormatter={(value) => value.slice(0, 3)}
                                interval={0}
                            />
                            <ChartTooltip
                                cursor={{
                                    stroke: '#29BDAD',
                                    strokeDasharray: 5,
                                }}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Line
                                dataKey="count"
                                type="monotone"
                                stroke="var(--color-desktop)"
                                strokeWidth={2}
                                dot={true}
                            />
                        </LineChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
