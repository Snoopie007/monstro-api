import { Member } from '@/types/member'
import React from 'react'
import { CustomerEmail, CustomerName, ListChartItem, ListChartInfo, ListChartData } from './ListChart'
import { Skeleton } from '@/components/ui/skeleton'

type TopSpender = Member & {
    totalAmount: number
}


interface TopSpendersProps {
    isLoading: boolean
    data: TopSpender[]
}

export function TopSpenders({ isLoading, data }: TopSpendersProps) {
    if (isLoading) {
        return (
            <div className='flex flex-col gap-2'>
                <div className='text-base font-semibold'>
                    Top Members by Spend
                </div>
                <Skeleton className='w-full h-40' />
            </div>
        )
    }
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>
                Top Members by Spend
            </div>
            {data.length === 0 ? (
                <div className='flex flex-col gap-2 text-sm text-muted-foreground py-4'>
                    No members found
                </div>
            ) : (
                <div className='flex flex-col gap-2'>
                    {data.map((m) => (
                        <ListChartItem key={m.id}>
                            <ListChartInfo>
                                <CustomerName>{m.firstName} {m.lastName}</CustomerName>
                                <CustomerEmail>{m.email}</CustomerEmail>


                            </ListChartInfo>
                            <ListChartData>${m.totalAmount}</ListChartData>
                        </ListChartItem>
                    ))}
                </div>
            )}
        </div>
    )
}
