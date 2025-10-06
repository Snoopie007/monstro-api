"use client";
import React, { use } from 'react'
import { ScrollArea } from '@/components/ui'
import {
    RevenueChart, RecurringRevenueChart,
    TopSpenders, ChurnedMembers, CustomerLTVChart,
    NewCustomerChart,
    ActiveTrend,
    NewMemberTrend,
    RevenueTrent,
    ReccuringTrend
} from '@/components/reports'
import { useReport } from '@/hooks/useReports';

export default async function LocationDashboard(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const { transactions, mls } = useReport({
        lid: id,
    });

    return (
        <ScrollArea className='  h-full '>
            <div className='grid grid-cols-4 p-4 gap-4'>

                <div className=' col-span-3 space-y-4     '>
                    <div className="grid grid-cols-4 gap-4">
                        <ActiveTrend mls={mls} />
                        <NewMemberTrend mls={mls} />
                        <RevenueTrent transactions={transactions} />
                        <ReccuringTrend transactions={transactions} />
                    </div>
                    <div className='grid grid-cols-3 gap-4'>
                        <div className='col-span-2'>
                            <RevenueChart transactions={transactions} />
                        </div>

                        <div className='col-span-1'>
                            <NewCustomerChart mls={mls} />
                        </div>


                    </div>
                    <div className='col-span-2 grid grid-cols-2 gap-4'>

                        <CustomerLTVChart transactions={transactions} />
                        <RecurringRevenueChart transactions={transactions} />
                    </div>
                </div>
                <div className='col-span-1 space-y-4'>
                    <TopSpenders mls={mls} transactions={transactions} />
                    <ChurnedMembers lid={id} />
                </div>
            </div>
        </ScrollArea>
    )
}
