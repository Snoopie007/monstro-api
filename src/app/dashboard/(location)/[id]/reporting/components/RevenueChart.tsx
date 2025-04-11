'use client'
import React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TrendingUp } from 'lucide-react'
import { useReportFilters } from '../provider/ReportContext'
import { Skeleton } from '@/components/ui'
import ChartYAxis from './YAxis'

const chartConfig = {
    desktop: {
        label: "Revenue",
        color: "#10B981",
    },
}

interface RevenueChartProps {
    isLoading: boolean
    data: { month: string, amount: number }[]
}

export function RevenueChart({ isLoading, data }: RevenueChartProps) {
    const { filters } = useReportFilters()
    const maxAmount = React.useMemo(() => {
        if (!data) return 0;
        return Math.max(...data.map(item => item.amount))

    }, [data]);
    return (
        <div className='space-y-4'>

            <div className='text-base font-semibold'>
                Gross Revenue
            </div>
            <div className='space-y-2 relative'>
                {isLoading ? (
                    <Skeleton className='w-full h-48' />
                ) : (

                    <div className=' relative flex flex-row'>
                        <ChartYAxis max={maxAmount} min={0} type="currency" />
                        <ChartContainer config={chartConfig} className='flex-1'>
                            <LineChart
                                accessibilityLayer
                                data={data}
                            >
                                <CartesianGrid vertical={false} horizontal={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={true}
                                    axisLine={true}
                                    interval={10}
                                    type="category"
                                    includeHidden={true}
                                    padding={{ left: 50, right: 0 }}
                                    tick={(tick) => {
                                        const label = tick.payload.value.slice(0, 3);
                                        const isLastTick = tick.payload.index === data.length - 1;
                                        return (
                                            <g transform={`translate(${tick.x},${tick.y})`}>
                                                <text x={10} dy="0.71em" dx={isLastTick ? -12 : -5} textAnchor={isLastTick ? "end" : "start"} fill={tick.fill}>
                                                    {label}
                                                </text>
                                            </g>

                                        );
                                    }}
                                />

                                <ChartTooltip
                                    cursor={{ stroke: "#ccc", strokeDasharray: 6 }}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Line
                                    dataKey="amount"
                                    type="monotone"
                                    stroke="var(--color-desktop)"
                                    strokeWidth={1}
                                    dot={true}

                                />
                            </LineChart>
                        </ChartContainer>




                    </div>




                )}

                <div className='text-xs'>
                    <span className="flex gap-2 text-xs font-medium leading-none">

                        Trending up by 7.3% this month <TrendingUp size={16} />
                    </span>
                    <span className="leading-none text-muted-foreground">
                        Showing total recurring revenue for the last 12 months
                    </span>
                </div>
            </div>
        </div>
    )
}
