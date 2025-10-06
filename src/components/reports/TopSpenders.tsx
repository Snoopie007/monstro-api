'use client'
import { Member, MemberLocation } from '@/types/member'
import React, { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Transaction } from '@/types/transaction'

type TopSpender = Member & {
    totalAmount: number
}

interface TopSpendersProps {
    mls: MemberLocation[]
    transactions: Transaction[]
}


export function TopSpenders({ mls, transactions }: TopSpendersProps) {

    const [loading, setLoading] = React.useState(false)
    const [data, setData] = React.useState<TopSpender[]>([])


    useEffect(() => {
        if (mls && transactions) {
            const memberTotals = new Map<string, number>();

            transactions.forEach((tx) => {
                if (!tx.memberId) return;
                const currentTotal = memberTotals.get(tx.memberId) || 0;
                memberTotals.set(tx.memberId, currentTotal + (tx.amount / 100 || 0));
            });

            const mappedData = Array.from(memberTotals.entries())
                .map(([id, amount]) => ({
                    ...mls.find((m) => m.memberId === id)?.member,
                    totalAmount: amount,
                }))
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10);

            setData(mappedData as TopSpender[])
            setLoading(false)
        }
    }, [mls, transactions])

    return (
        <Card className='bg-foreground/5 rounded-lg border-foreground/10 p-0'>
            <CardHeader className='flex flex-row justify-between items-center' >
                <CardTitle className='text-lg font-semibold'>
                    Top Members by Spend
                </CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className='flex flex-col  text-center gap-2 text-sm text-muted-foreground py-4'>
                        No members found
                    </div>
                ) : (
                    <div className='flex flex-col gap-2 space-y-2'>
                        {data.map((m) => (
                            <TopSpenderItem key={m.id} m={m} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


function TopSpenderItem({ m }: { m: Record<string, any> }) {
    return (
        <div className='flex flex-row justify-between items-center'>
            <div className='space-y-0'>
                <div className='text-base font-semibold'>{m.firstName} {m.lastName}</div>
                <div className='text-sm text-muted-foreground'>{m.email}</div>
            </div>
            <div className='text-base font-semibold'>${m.totalAmount.toFixed(2)}</div>
        </div>
    )
}