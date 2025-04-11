'use client'
import React, { use } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    RevenueChart,
    RecurringRevenueChart,
    NewCustomerChart,
    ChurnedMembers,
    TopSpenders
} from './components'
import { CustomerLTVChart } from './components/LTVChart'
import ReportDatePicker from './components/ReportDatePicker'
import { ReportProvider } from './provider/ReportContext'
import { useReport } from '@/hooks/useReports'



export default function Reporting(props: { params: Promise<{ id: string }> }) {
    const { id } = use(props.params)
    const { reports, isLoading, error } = useReport(id)

    return (

        <ReportProvider>
            <ScrollArea className='w-full h-[calc(100vh-50px)]  py-8'>
                <div className='w-full  max-w-7xl mx-auto space-y-6'>
                    <div className='flex flex-row justify-between gap-2 border-b border-foreground/10 pb-4'>
                        <h2 className='text-xl font-semibold'>Reporting Overview</h2>
                        <div>
                            <ReportDatePicker />
                        </div>
                    </div>
                    <div className='space-y-10 '>
                        <div className='grid grid-cols-3 gap-12 border-b border-foreground/10 pb-10'>
                            <RevenueChart isLoading={isLoading} data={reports?.revenueData} />
                            <RecurringRevenueChart isLoading={isLoading} data={reports?.recurringRevenueData} />
                        </div>

                        <div className='grid grid-cols-3 gap-12 border-b border-foreground/10 pb-10'>
                            <NewCustomerChart isLoading={isLoading} data={reports?.newMembersByMonth} />
                            <CustomerLTVChart />
                            <TopSpenders isLoading={isLoading} data={reports?.topCustomersBySpend} />




                        </div>
                        <div className='grid grid-cols-3 gap-12   '>
                            <ChurnedMembers isLoading={isLoading} data={reports?.recentCancelledMembers} />
                        </div>


                    </div>
                </div>
            </ScrollArea>
        </ReportProvider>

    )
}
