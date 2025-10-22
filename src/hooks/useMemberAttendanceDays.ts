'use client'
import { useMemo, useState } from 'react'
import { useAttedance } from './hooks'
import { formatDate, subDays } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { ExtendedAttendance } from '@/types/attendance'

export const useMemberAttendanceDays = (id: string, mid: string) => {
    const now = new Date()
    const fromFallback = subDays(now, 90)
    const [range, setRange] = useState<DateRange>({
        from: fromFallback,
        to: now,
    })

    const { attendances, isLoading, error } = useAttedance(id, mid)

    const formattedAttendancesDays = useMemo(() => {
        if (!attendances || attendances.length === 0) {
            return {}
        }

        const attendanceMap: Record<string, number> = {}

        attendances.forEach((attendance: any) => {
            const checkInDate = new Date(attendance.checkInTime)
            const dateStr = formatDate(checkInDate, 'yyyy-MM-dd')
            if (
                checkInDate > (range.from ?? now) &&
                checkInDate < (range.to ?? fromFallback)
            ) {
                attendanceMap[dateStr] = 1
            } else {
                attendanceMap[dateStr] = 0
            }
        })

        return attendanceMap
    }, [attendances, range, now, fromFallback])

    // Helper function to generate weeks for a specific month
    const generateWeeksForMonth = (year: number, month: number) => {
        const firstDayOfMonth = new Date(year, month, 1)
        const startingDayOfWeek = firstDayOfMonth.getDay()
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
        const allDates: any[] = []
        // Add empty placeholders for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            allDates.push({
                date: null,
                count: 0,
                isCurrentMonth: false,
                isEmpty: true,
            })
        }

        // Add all current month dates
        for (let day = 1; day <= lastDayOfMonth; day++) {
            const date = new Date(year, month, day)
            const dateStr = date.toISOString().split('T')[0]

            // Get all attendances for this specific date
            const dayAttendances = (attendances || [])
                .filter((att: ExtendedAttendance) => {
                    const attDate = new Date(att.checkInTime)
                        .toISOString()
                        .split('T')[0]
                    return attDate === dateStr
                })
                .map((att: ExtendedAttendance) => ({
                    programName: att.programName,
                    startTime: att.startTime,
                    endTime: att.endTime,
                    checkInTime: att.checkInTime,
                    checkOutTime: att.checkOutTime,
                }))

            allDates.push({
                date: dateStr,
                count: formattedAttendancesDays[dateStr],
                isCurrentMonth: true,
                isEmpty: false,
                attendances: dayAttendances,
            })
        }

        // Group into weeks (always 7 per week, fill with empty divs)
        const weeks = []
        for (let i = 0; i < allDates.length; i += 7) {
            const week = allDates.slice(i, i + 7)
            // Pad the last week with empty days to reach 7 items
            while (week.length < 7) {
                week.push({
                    date: null,
                    count: 0,
                    isCurrentMonth: false,
                    isEmpty: true,
                })
            }
            weeks.push(week)
        }

        return weeks
    }

    // Get months to display (current month and previous month)
    const currentMonth = range.to?.getMonth() || now.getMonth()
    const currentYear = range.to?.getFullYear() || now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const secondPreviousMonth = previousMonth === 0 ? 11 : previousMonth - 1
    const secondPreviousYear =
        previousMonth === 0 ? previousYear - 1 : previousYear

    const currentMonthWeeks = generateWeeksForMonth(currentYear, currentMonth)
    const previousMonthWeeks = generateWeeksForMonth(
        previousYear,
        previousMonth
    )
    const secondPreviousMonthWeeks = generateWeeksForMonth(
        secondPreviousYear,
        secondPreviousMonth
    )

    const formatDateToThreeMonths = (day: Date) => {
        const threeMonthsAgo = subDays(day, 90)
        const to = new Date(day)
        setRange({
            from: threeMonthsAgo,
            to: to,
        })
    }

    return {
        formattedAttendancesDays,
        range,
        formatDateToThreeMonths,
        currentMonthWeeks,
        previousMonthWeeks,
        secondPreviousMonthWeeks,
        isLoading,
        error,
    }
}
