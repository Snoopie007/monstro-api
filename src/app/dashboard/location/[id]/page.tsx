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

export default function LocationDashboard(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const { transactions, mls } = useReport({
        lid: id,
    });

    return (
        <ScrollArea className='  h-full '>
            <div className='grid grid-cols-4 pr-2 pb-2 gap-4'>

                <div className=' col-span-3 space-y-4     '>
                    <div className="grid grid-cols-4 gap-4">
                        <ActiveTrend mls={mls} lid={id} />
                        <NewMemberTrend mls={mls} lid={id} />
                        <RevenueTrent transactions={transactions} lid={id} />
                        <ReccuringTrend transactions={transactions} lid={id} />
                    </div>
                    <div className='grid grid-cols-3 gap-4'>
                        <div className='col-span-2'>
                            <RevenueChart transactions={transactions} lid={id} />
                        </div>

                        <div className='col-span-1'>
                            <NewCustomerChart mls={mls} lid={id} />
                        </div>


                    </div>
                    <div className='col-span-2 grid grid-cols-2 gap-4'>

                        <CustomerLTVChart transactions={transactions} lid={id} />
                        <RecurringRevenueChart transactions={transactions} lid={id} />
                    </div>
                </div>
                <div className='col-span-1 space-y-4'>
                    <TopSpenders mls={mls} transactions={transactions} lid={id} />
                    <ChurnedMembers lid={id} />
                </div>
            </div>
        </ScrollArea>
    )
}
