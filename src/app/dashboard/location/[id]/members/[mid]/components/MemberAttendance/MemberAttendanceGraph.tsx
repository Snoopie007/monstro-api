'use client'

import { MonthView } from './'
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
import { CardTitle } from '@/components/ui/card'
import { ChevronDownIcon, InfoIcon } from 'lucide-react'
import { useMemberAttendanceDays } from '@/hooks/useMemberAttendanceDays'

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
    } = useMemberAttendanceDays(params.id, params.mid)

    return (
        <div>
            <div className="flex flex-row w-full justify-start items-center mt-2 mb-2 gap-3">
                <CardTitle className="text-sm font-medium flex flex-row items-center gap-2">
                    <span>Attendance</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <InfoIcon className="size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            This graph shows the attendance of the member in the
                            last 3 months.
                        </TooltipContent>
                    </Tooltip>
                </CardTitle>
                {/* Select Year and Month */}
                <div className="flex flex-row gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                id="dates"
                                className="w-full justify-between font-normal text-sm px-3 py-1 h-7 border-foreground/10"
                            >
                                {range?.from && range?.to
                                    ? formatDate(range.from, 'MMM d') +
                                      ' - ' +
                                      formatDate(range.to, 'MMM d')
                                    : 'Pick a date'}
                                <ChevronDownIcon className="size-4" />
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
            <div>
                <div className="flex flex-row gap-3 w-full">
                    <MonthView weeks={secondPreviousMonthWeeks} />
                    <MonthView weeks={previousMonthWeeks} />
                    <MonthView weeks={currentMonthWeeks} />
                </div>
            </div>
        </div>
    )
}
