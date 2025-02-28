'use client'
import React from 'react'
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from '@/libs/utils'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useReportFilters } from '../provider/ReportContext'

export default function ReportDatePicker() {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2022, 0, 20),
        to: addDays(new Date(2022, 0, 20), 20),
    })
    const { setFilters } = useReportFilters()
    return (
        <div className={cn("grid gap-2",)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[240px] cursor-pointer flex h-auto py-2 items-center gap-2 text-xs rounded-sm justify-start text-left border-foreground/20",
                            !date && "text-foreground/60"
                        )}
                    >
                        <CalendarIcon size={14} />
                        {date?.from ?
                            (date.to ? (<>{format(date.from, "LLL dd, y")} -{" "}{format(date.to, "LLL dd, y")} </>)
                                : (format(date.from, "LLL dd, y"))
                            ) : (
                                <span>Pick a date</span>
                            )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>

    )
}