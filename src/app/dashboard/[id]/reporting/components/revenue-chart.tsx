import React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { totalGrossRevenueData } from '../dummy-data'
import { TrendingUp } from 'lucide-react'

const chartConfig = {
    desktop: {
        label: "Revenue",
        color: "#10B981",
    },
}

export function RevenueChart({ filters }: { filters: Record<string, any> }) {
    const maxAmount = React.useMemo(() => Math.max(...totalGrossRevenueData.map(item => item.revenue)), [totalGrossRevenueData]);
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>
                Gross Revenue
            </div>
            <div className='space-y-2 relative'>
                <div className=' relative flex flex-row'>
                    <div className='absolute  flex-initial font-medium text-xs text-gray-400 h-full'>
                        <div className='absolute top-0 left-0'>
                            <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(maxAmount)}</span>
                        </div>
                        <div className='absolute bottom-[16%] left-0'>
                            <span >$0.00</span>
                        </div>
                    </div>
                    <ChartContainer config={chartConfig} className='flex-1'>
                        <LineChart
                            accessibilityLayer
                            data={totalGrossRevenueData}
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
                                    const isLastTick = tick.payload.index === totalGrossRevenueData.length - 1;
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
                                dataKey="revenue"
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
