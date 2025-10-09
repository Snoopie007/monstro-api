'use client'
import { useMemo, useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Transaction } from '@/types/transaction'
import { MONTHS } from '@/libs/data'
import { Loader2 } from 'lucide-react'



const chartConfig = {
    desktop: {
        label: "LTV",
        color: "#8b5cf6",
    },
}


type Data = {
    month: string,
    amount: number
}


const DummyData = [
    { month: 'January', amount: 100 },
    { month: 'February', amount: 150 },
    { month: 'March', amount: 200 },
    { month: 'April', amount: 250 },
    { month: 'May', amount: 300 },
    { month: 'June', amount: 350 },
    { month: 'July', amount: 400 },
    { month: 'August', amount: 450 },
    { month: 'September', amount: 500 },
    { month: 'October', amount: 550 },
    { month: 'November', amount: 600 },
    { month: 'December', amount: 650 }
]


export function CustomerLTVChart({ transactions, lid }: { transactions: Transaction[], lid?: string }) {

    const [loading, setLoading] = useState(true)
    const data = useMemo<Data[]>(() => {
        if (lid === 'acc_Kx9mN2pQ8vR4tL6wE3yZ5s') {
            return DummyData
        }

        if (transactions && transactions.length > 0) {
            // Group transactions by member and month
            const memberMonthlyTotals = new Map<string, Map<string, number>>();

            // Process each transaction
            transactions.forEach((tx) => {
                if (!tx.memberId || !tx.created || tx.refunded) return;

                // Get or create member map
                if (!memberMonthlyTotals.has(tx.memberId)) {
                    memberMonthlyTotals.set(tx.memberId, new Map());
                }

                const memberMap = memberMonthlyTotals.get(tx.memberId)!;
                const month = MONTHS[new Date(tx.created).getMonth()];
                const currentAmount = memberMap.get(month) || 0;
                memberMap.set(month, currentAmount + tx.amount / 100);
            });

            // Calculate median LTV for each month
            const mappedData = MONTHS.map((month) => {
                // Get all non-zero values for this month
                const values = Array.from(memberMonthlyTotals.values())
                    .map((memberMap) => memberMap.get(month) || 0)
                    .filter((amount) => amount > 0);

                let median = 0;
                if (values.length > 0) {
                    values.sort((a, b) => a - b);
                    const mid = Math.floor(values.length / 2);
                    median =
                        values.length % 2 === 0
                            ? (values[mid - 1] + values[mid]) / 2
                            : values[mid];
                }

                return { month, amount: median };
            });
            return mappedData
        }
        return MONTHS.map((month) => ({
            month,
            amount: 0,
        }))
    }, [transactions, lid])


    useEffect(() => {
        if (transactions) {
            setLoading(false)
        }

    }, [transactions]);


    const maxAmount = useMemo(() => {
        if (!data) return 0;
        return Math.max(...data.map((item: Data) => item.amount))
    }, [data]);

    return (
        <Card className='bg-foreground/5 rounded-lg border-foreground/10 p-0'>
            <CardHeader className='flex flex-row justify-between items-center' >
                <CardTitle className='text-lg font-semibold'>
                    Customer LTV
                </CardTitle>

            </CardHeader >
            <CardContent className='space-y-2 relative'>
                {loading ? (
                    <div className='flex flex-row items-center justify-center h-[300px] gap-2'>
                        <Loader2 className='animate-spin' size={16} /> Loading data...
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className='w-full h-[300px]'>
                        <LineChart
                            accessibilityLayer
                            data={data}
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

                            <ChartTooltip cursor={{ stroke: "#29BDAD", strokeDasharray: 5 }} content={<ChartTooltipContent hideLabel />} />
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
