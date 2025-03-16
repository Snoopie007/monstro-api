import React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { newCustomersData } from '../dummy-data'
import { TrendingUp } from 'lucide-react'
import ChartYAxis from '../components/YAxis'

const chartConfig = {
    desktop: {
        label: "Customers",
        color: "#2563eb",
    },
}

export function NewCustomerChart() {
    const maxCustomers = React.useMemo(() => Math.max(...newCustomersData.map(item => item.customers)), [newCustomersData]);
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>
                New Customers
            </div>
            <div className='space-y-2'>
                <div className=' relative flex flex-row'>
                    <ChartYAxis maxAmount={maxCustomers} type="number" />
                    <ChartContainer config={chartConfig} className='flex-1'>
                        <LineChart
                            accessibilityLayer

                            data={newCustomersData}


                        >
                            <CartesianGrid vertical={false} horizontal={false} />
                            <XAxis dataKey="month" tickLine={true} axisLine={true} interval={10} type="category" includeHidden={true} padding={{ left: 50, right: 0 }} tick={(tick) => {

                                const label = tick.payload.value.slice(0, 3);
                                const isLastTick = tick.payload.index === newCustomersData.length - 1;
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

                                dataKey="customers"
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
                        Trending up by 5.2% this month <TrendingUp size={16} />
                    </span>
                    <span className="leading-none text-muted-foreground">
                        Showing total new members for the last 12 months
                    </span>
                </div>
            </div>
        </div>
    )
}
