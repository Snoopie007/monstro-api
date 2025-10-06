'use client'
import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '../event-calendar'
import { Transaction } from '@/types/transaction'
import { MONTHS } from '@/libs/data'
import { Loader2 } from 'lucide-react'

const chartConfig = {
    desktop: {
        label: "Revenue",
        color: "#10B981",
    },
}

type Data = {
    month: string,
    amount: number
}

export function RevenueChart({ transactions }: { transactions: Transaction[] }) {
    const [range, setRange] = useState(12)
    const [loading, setLoading] = useState(true)

    const data = useMemo<Data[]>(() => {
        if (transactions && transactions.length > 0) {
            const revenueByMonth = Object.fromEntries(MONTHS.map((month) => [month, 0]));
            transactions.forEach((transaction) => {
                if (transaction.status === "paid" && !transaction.refunded) {
                    const month = MONTHS[new Date(transaction.created as Date).getMonth()];
                    revenueByMonth[month] += transaction.amount / 100;
                }
            });

            const mappedData = MONTHS.map((month) => ({
                month,
                amount: revenueByMonth[month],
            }));

            return mappedData;
        }
        // If transactions is empty array, return all months with 0 amount
        return MONTHS.map((month) => ({
            month,
            amount: 0,
        }));
    }, [transactions]);

    const filteredData = useMemo(() => {
        return data.slice(-range);
    }, [data, range]);

    useEffect(() => {
        if (transactions) {
            setLoading(false)
        }
    }, [transactions]);


    return (
        <Card className='bg-foreground/5 rounded-lg border-foreground/10 p-0'>
            <CardHeader className='flex flex-row justify-between items-center' >
                <CardTitle className='text-lg font-semibold'>
                    Gross Revenue
                </CardTitle>
                <div className='flex flex-row gap-2 bg-foreground/10 rounded-lg px-2 py-1'>
                    {[3, 6, 12].map((item) => (
                        <div
                            key={item}
                            className={cn(
                                `cursor-pointer text-sm px-3 font-semibold py-1 rounded transition-colors hover:bg-foreground/20`,
                                { 'bg-indigo-500 text-white': range === item }
                            )}
                            onClick={() => setRange(item)}
                        >
                            {item} months
                        </div>
                    ))}
                </div>
            </CardHeader >
            <CardContent className='space-y-2 relative'>
                {loading ? (
                    <div className='flex flex-row items-center justify-center h-[450px] gap-2'>
                        <Loader2 className='animate-spin' size={16} /> Loading data...
                    </div>
                ) : (

                    <ChartContainer config={chartConfig} className='w-full h-[450px]' >
                        <LineChart
                            accessibilityLayer
                            data={filteredData}
                            margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                        >
                            <CartesianGrid vertical={false} horizontal={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                                interval={0}
                            />

                            <ChartTooltip
                                cursor={{ stroke: "#ccc", strokeDasharray: 6 }}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Line
                                dataKey="amount"
                                type="monotone"
                                stroke="var(--color-desktop)"
                                strokeWidth={2}
                                dot={true}
                            />
                        </LineChart>
                    </ChartContainer>


                )}

            </CardContent>
        </Card >
    )
}
