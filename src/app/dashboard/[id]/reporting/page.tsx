"use client"
import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    RevenueChart, RecurringRevenueChart, NewCustomerChart,
    ListChartItem, CustomerName, CustomerEmail, ListChartInfo, ListChartData
} from './components'
import { CustomerLTVChart } from './components/ltv-chart'
import { topCustomerSpendersData } from './dummy-data'
import { Badge } from '@/components/ui'
import ReportDatePicker from './components/report-date-picker'
import { ReportProvider } from './provider/report-context'


export default function Reporting() {

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
                            <RevenueChart />
                            <RecurringRevenueChart />
                        </div>

                        <div className='grid grid-cols-3 gap-12 border-b border-foreground/10 pb-10'>
                            <NewCustomerChart />
                            <CustomerLTVChart />
                            <div className="space-y-4">

                                <div className="text-base font-semibold">Top customers by spend</div>
                                <div className="flex flex-col gap-2">
                                    {topCustomerSpendersData.map((customer) => (
                                        <ListChartItem key={customer.memberId}>
                                            <ListChartInfo>
                                                <CustomerName>{customer.firstName} {customer.lastName}</CustomerName>
                                                <CustomerEmail>{customer.email}</CustomerEmail>


                                            </ListChartInfo>
                                            <ListChartData>${customer.spend}</ListChartData>
                                        </ListChartItem>
                                    ))}
                                </div>
                            </div>




                        </div>
                        <div className='grid grid-cols-3 gap-12   '>

                            <div className="space-y-4">
                                <div className="text-base font-semibold">Recently churned customers</div>
                                <div className="flex flex-col gap-2">
                                    {topCustomerSpendersData.map((customer) => (
                                        <ListChartItem key={customer.memberId}>
                                            <ListChartInfo>
                                                <CustomerName>{customer.firstName} {customer.lastName}</CustomerName>
                                                <CustomerEmail>{customer.email}</CustomerEmail>

                                            </ListChartInfo>
                                            <ListChartData>
                                                <Badge className='bg-red-500 rounded-xs text-xs h-auto py-0.5 text-white'>Canceled</Badge>
                                            </ListChartData>
                                        </ListChartItem>

                                    ))}
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </ScrollArea>
        </ReportProvider>

    )
}
