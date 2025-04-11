'use client'
import React, { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { customerLTVData } from '../dummy-data'
import { TrendingUp } from 'lucide-react'
import ChartYAxis from './YAxis'
import { useReportFilters } from '../provider/ReportContext'

const chartConfig = {
    desktop: {
        label: "LTV",
        color: "#10B981",
    },
}


export function CustomerLTVChart() {
    const { filters } = useReportFilters()
    const [data, setData] = useState<Record<string, any>[]>([])
    const maxAmount = React.useMemo(() => Math.max(...customerLTVData.map(item => item.amount)), [customerLTVData]);

    useEffect(() => {
        const monthOrder = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const groups = customerLTVData.reduce((acc, { month, amount }) => {
            (acc[month] = acc[month] || []).push(amount);
            return acc;
        }, {} as Record<string, number[]>);

        const calculatedData = Object.entries(groups)
            .map(([month, amounts]) => {
                amounts.sort((a, b) => a - b);
                const mid = Math.floor(amounts.length / 2);
                const median = amounts.length % 2 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;
                return { month, amount: median };
            })
            .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

        setData(calculatedData);
    }, [customerLTVData])
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>

                Median Customer LTV
            </div>
            <div className='space-y-2 relative'>
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
                                    const isLastTick = tick.payload.index === customerLTVData.length - 1;
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
