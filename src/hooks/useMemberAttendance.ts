'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDate, subDays } from 'date-fns'
import { format } from 'date-fns-tz'
import type { DateRange } from 'react-day-picker'
import type { ExtendedAttendance, MissedReservation, AttendanceResponse } from '@/types/attendance'

async function fetchAttendanceData(
    locationId: string,
    memberId: string
): Promise<AttendanceResponse> {
    const res = await fetch(
        `/api/protected/loc/${locationId}/members/${memberId}/attendances`
    )

    if (!res.ok) {
        throw new Error('Failed to fetch attendance data')
    }

    return res.json()
}

export const useMemberAttendance = (id: string, mid: string) => {
    const now = new Date()
    const fromFallback = subDays(now, 90)
    const [range, setRange] = useState<DateRange>({
        from: fromFallback,
        to: now,
    })

    const { data, isLoading, error } = useQuery({
        queryKey: ['member-attendance', id, mid],
        queryFn: () => fetchAttendanceData(id, mid),
        enabled: !!id && !!mid,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    })

    const attendances = data?.attendances ?? []
    const missedReservations = data?.missedReservations ?? []

    const formattedAttendancesDays = useMemo(() => {
        if (!attendances || attendances.length === 0) {
            return {}
        }
        const attendanceMap: Record<string, number> = {}
        attendances.forEach((attendance: ExtendedAttendance) => {
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

    const totalAttendances = useMemo(() => {
        return Object.values(formattedAttendancesDays).reduce((acc, curr) => acc + curr, 0)
    }, [formattedAttendancesDays])

    const generateWeeksForMonth = (year: number, month: number) => {
        const firstDayOfMonth = new Date(year, month, 1)
        const startingDayOfWeek = firstDayOfMonth.getDay()
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
        const allDates: Array<{
            date: Date
            count: number
            isCurrentMonth: boolean
            isEmpty: boolean
            attendances?: Array<{
                programName: string
                startTime: Date
                endTime: Date
                checkInTime: Date
                checkOutTime: Date | null
            }>
            missedReservations?: Array<{
                id: string
                programName: string
                startOn: Date | string
                programId?: string
            }>
        }> = []

        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDayDate = new Date(year, month, 1 - (startingDayOfWeek - i))
            allDates.push({
                date: emptyDayDate,
                count: 0,
                isCurrentMonth: false,
                isEmpty: true,
            })
        }

        for (let day = 1; day <= lastDayOfMonth; day++) {
            const date = new Date(year, month, day)
            const dateStr = date.toISOString().split('T')[0]

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

            const dayMissedReservations = (missedReservations || [])
                .filter((res: MissedReservation) => {
                    const resDate = new Date(res.startOn).toISOString().split('T')[0]
                    return resDate === dateStr
                })
                .map((res: MissedReservation) => ({
                    id: res.id,
                    programName: res.programName,
                    startOn: res.startOn,
                    programId: res.programId ?? undefined,
                }))

            allDates.push({
                date: date,
                count: formattedAttendancesDays[dateStr],
                isCurrentMonth: true,
                isEmpty: false,
                attendances: dayAttendances,
                missedReservations: dayMissedReservations,
            })
        }

        const weeks = []
        for (let i = 0; i < allDates.length; i += 7) {
            const week = allDates.slice(i, i + 7)
            while (week.length < 7) {
                const paddingDate = new Date(year, month + 1, week.length - 6 + lastDayOfMonth)
                week.push({
                    date: paddingDate,
                    count: 0,
                    isCurrentMonth: false,
                    isEmpty: true,
                })
            }
            weeks.push(week)
        }

        return weeks
    }

    const currentMonth = range.to?.getMonth() || now.getMonth()
    const currentYear = range.to?.getFullYear() || now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const secondPreviousMonth = previousMonth === 0 ? 11 : previousMonth - 1
    const secondPreviousYear =
        previousMonth === 0 ? previousYear - 1 : previousYear

    const currentMonthWeeks = generateWeeksForMonth(currentYear, currentMonth)
    const currentMonthName = format(new Date(currentYear, currentMonth, 1), 'MMM')
    const previousMonthWeeks = generateWeeksForMonth(
        previousYear,
        previousMonth
    )
    const previousMonthName = format(new Date(previousYear, previousMonth, 1), 'MMM')
    const secondPreviousMonthWeeks = generateWeeksForMonth(
        secondPreviousYear,
        secondPreviousMonth
    )
    const secondPreviousMonthName = format(new Date(secondPreviousYear, secondPreviousMonth, 1), 'MMM')
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
        currentMonthName,
        previousMonthWeeks,
        previousMonthName,
        secondPreviousMonthWeeks,
        secondPreviousMonthName,
        totalAttendances,
        isLoading,
        error,
    }
}
