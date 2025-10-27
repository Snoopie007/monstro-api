'use client'

import { MonthView } from '.'
import { formatDate } from 'date-fns'
import {
    Calendar,
    PopoverTrigger,
    Popover,
    Button,
    PopoverContent,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from '@/components/ui'
import { ChevronDownIcon, InfoIcon } from 'lucide-react'
import { useMemberAttendance } from '@/hooks'

export const MemberAttendanceGraph = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const {
        range,
        currentMonthWeeks,
        previousMonthWeeks,
        secondPreviousMonthWeeks,
        formatDateToThreeMonths,
    } = useMemberAttendance(params.id, params.mid)

    return (
        <div className='bg-muted/50 rounded-lg px-4 py-2'>
            <div className="flex flex-row w-full justify-between items-center mb-4">
                <div className="flex flex-row items-center gap-1">
                    <span className='text-sm font-medium'>Attendance</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            This graph shows the attendance of the member in the
                            last 3 months.
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex flex-row gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                id="dates"
                                className="gap-1 justify-between font-normal text-xs px-3 py-1 h-6 bg-foreground/5 border-none rounded-sm"
                            >
                                <span>{range?.from && range?.to
                                    ? formatDate(range.from, 'MMM d') +
                                    ' - ' +
                                    formatDate(range.to, 'MMM d')
                                    : 'Pick a date'}</span>
                                <ChevronDownIcon className="size-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto overflow-hidden p-0 border-foreground/10"
                            align="start"
                        >
                            <Calendar
                                mode="range"
                                selected={range}
                                onDayClick={(day) => {
                                    formatDateToThreeMonths(day)
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className='space-y-6 '>
                <div className="flex flex-row gap-3 w-full">
                    <MonthView weeks={secondPreviousMonthWeeks} />
                    <MonthView weeks={previousMonthWeeks} />
                    <MonthView weeks={currentMonthWeeks} />
                </div>
                <p className='text-xs font-medium'>
                    <span >Total Attendance 100</span>

                </p>
            </div>
        </div >
    )
}
