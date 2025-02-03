import React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { recurringRevenueData } from '../dummy-data'
import { TrendingUp } from 'lucide-react'
import ChartYAxis from './y-axis'

const chartConfig = {
    desktop: {
        label: "Recurring Revenue",
        color: "#10B981",
    },
}

export function RecurringRevenueChart({ filters }: { filters: Record<string, any> }) {

    const maxAmount = React.useMemo(() => Math.max(...recurringRevenueData.map(item => item.amount)), [recurringRevenueData]);
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>
                Recurring Revenue
            </div>
            <div className='space-y-2 relative'>
                <div className=' relative flex flex-row'>
                    <ChartYAxis maxAmount={maxAmount} type="currency" />
                    <ChartContainer config={chartConfig} className='flex-1'>
                        <LineChart
                            accessibilityLayer
                            data={recurringRevenueData}


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
                                    const isLastTick = tick.payload.index === recurringRevenueData.length - 1;
                                    return (
                                        <g transform={`translate(${tick.x},${tick.y})`}>
                                            <text x={10} dy="0.71em" dx={isLastTick ? -12 : -5} textAnchor={isLastTick ? "end" : "start"} fill={tick.fill}>
                                                {label}
                                            </text>
                                        </g>

                                    );
                                }}
                            />

                            <ChartTooltip cursor={{ stroke: "#29BDAD", strokeDasharray: 5 }} content={<ChartTooltipContent hideLabel />} />
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
