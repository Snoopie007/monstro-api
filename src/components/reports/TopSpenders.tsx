'use client'
import { Member, MemberLocation } from '@/types/member'
import React, { useEffect, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Transaction } from '@/types/transaction'

type TopSpender = Member & {
    totalAmount: number
}

interface TopSpendersProps {
    mls: MemberLocation[]
    transactions: Transaction[]
    lid?: string
}

const DummyData: TopSpender[] = [
    {
        id: '1',
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'michael.johnson@email.com',
        totalAmount: 2450.0,
    } as TopSpender,
    {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.williams@email.com',
        totalAmount: 2180.5,
    } as TopSpender,
    {
        id: '3',
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@email.com',
        totalAmount: 1950.75,
    } as TopSpender,
    {
        id: '4',
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@email.com',
        totalAmount: 1825.25,
    } as TopSpender,
    {
        id: '5',
        firstName: 'James',
        lastName: 'Miller',
        email: 'james.miller@email.com',
        totalAmount: 1675.0,
    } as TopSpender,
]

export function TopSpenders({ mls, transactions, lid }: TopSpendersProps) {
    const [loading, setLoading] = React.useState(true)

    const data = useMemo(() => {
        if (lid === 'acc_BpT7jEb3Q16nOPL3vo7qlw') {
            return DummyData
        }

        if (mls && transactions) {
            const memberTotals = new Map<string, number>()

            transactions.forEach((tx) => {
                if (!tx.memberId) return
                const currentTotal = memberTotals.get(tx.memberId) || 0
                memberTotals.set(
                    tx.memberId,
                    currentTotal + (tx.total / 100 || 0)
                )
            })

            const mappedData = Array.from(memberTotals.entries())
                .map(([id, amount]) => {
                    const member = mls.find((m) => m.memberId === id)?.member

                    return {
                        ...member,
                        totalAmount: amount,
                    }
                })
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10)

            return mappedData as TopSpender[]
        }
        return []
    }, [mls, transactions, lid])

    useEffect(() => {
        if (mls && transactions) {
            setLoading(false)
        }
    }, [mls, transactions])

    return (
        <Card className="bg-foreground/5 rounded-lg border-foreground/10 p-0">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                    Top Members by Spend
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex flex-col gap-2 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex flex-row justify-between items-center"
                            >
                                <div className="space-y-1">
                                    <Skeleton className="bg-foreground/10 w-32 h-4" />
                                    <Skeleton className="bg-foreground/10 w-40 h-3" />
                                </div>
                                <Skeleton className="bg-foreground/10 w-16 h-4" />
                            </div>
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col  text-center gap-2 text-sm text-muted-foreground py-4">
                        No members found
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 space-y-2">
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
        <div className="flex flex-row justify-between items-center">
            <div className="space-y-0">
                <div className="text-base font-semibold">
                    {m.firstName} {m.lastName}
                </div>
                <div className="text-sm text-muted-foreground">{m.email}</div>
            </div>
            <div className="text-base font-semibold">
                ${m.totalAmount.toFixed(2)}
            </div>
        </div>
    )
}
