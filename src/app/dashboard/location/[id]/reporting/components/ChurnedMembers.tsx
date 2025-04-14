import { Member } from '@/types/member'
import React from 'react'
import { CustomerEmail, CustomerName, ListChartItem, ListChartInfo } from './ListChart'
import { Skeleton } from '@/components/ui/skeleton'


interface ChurnedMembersProps {
    isLoading: boolean
    data: Member[]
}

export function ChurnedMembers({ isLoading, data }: ChurnedMembersProps) {
    if (isLoading) {
        return (
            <div className='flex flex-col gap-2'>
                <div className='text-base font-semibold'>
                    Recent Cancelled Members
                </div>
                <Skeleton className='w-full h-40' />
            </div>
        )
    }
    return (
        <div className='space-y-4'>
            <div className='text-base font-semibold'>
                Recent Cancelled Members
            </div>
            {data.length === 0 ? (
                <div className='flex flex-col gap-2 text-sm text-muted-foreground py-2'>
                    No recent cancelled members found
                </div>
            ) : (
                <div className='flex flex-col gap-2'>
                    {data.map((member) => (
                        <ListChartItem key={member.id}>
                            <ListChartInfo>
                                <CustomerName>{member.firstName} {member.lastName}</CustomerName>
                                <CustomerEmail>{member.email}</CustomerEmail>
                            </ListChartInfo>
                        </ListChartItem>
                    ))}
                </div>
            )}
        </div>
    )
}
