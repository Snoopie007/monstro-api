'use client'

import { ScrollArea, Skeleton } from '@/components/ui'
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from '@/components/ui/item'
import { Badge } from '@/components/ui/badge'
import { format, isBefore } from 'date-fns'
import { useAttedance } from '@/hooks'
import { cn } from '@/libs/utils'

export const MemberAttendanceItems = ({
    params,
}: {
    params: { id: string; mid: string }
}) => {
    const { attendances, isLoading, error } = useAttedance(
        params.id,
        params.mid
    )

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
                <Skeleton className="w-full h-24 " />
            </div>
        )
    }

    const renderAttendances = () => {
        return attendances && attendances.length > 0 ? (
            attendances.map((attendance: any) => {
                const isLate = isBefore(
                    attendance.checkInTime,
                    attendance.startTime
                )
                return (
                    <li key={attendance.id}>
                        <Item
                            variant="muted"
                            className="hover:bg-muted-foreground/5"
                        >
                            <ItemContent>
                                <ItemTitle>
                                    {attendance.programName}
                                    {' • '}
                                    <span className="text-muted-foreground text-xs">
                                        {format(
                                            attendance.startTime,
                                            'MMM d, yyyy'
                                        )}
                                    </span>
                                </ItemTitle>
                                <ItemDescription>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>
                                            {format(
                                                attendance.startTime,
                                                'hh:mm a'
                                            )}{' '}
                                            -{' '}
                                            {format(
                                                attendance.endTime,
                                                'hh:mm a'
                                            )}{' '}
                                            • Checked in:{' '}
                                            {format(
                                                attendance.checkInTime,
                                                'hh:mm a'
                                            )}
                                            {attendance.checkOutTime &&
                                                ` • Checked out: ${format(
                                                    attendance.checkOutTime,
                                                    'hh:mm a'
                                                )}`}
                                        </span>
                                        <Badge
                                            className={cn(
                                                isLate
                                                    ? 'bg-red-500'
                                                    : 'bg-green-500'
                                            )}
                                        >
                                            {isLate ? 'Late' : 'On Time'}
                                        </Badge>
                                    </div>
                                </ItemDescription>
                            </ItemContent>
                        </Item>
                    </li>
                )
            })
        ) : (
            <li>
                <Item variant="muted" className="hover:bg-muted-foreground/5">
                    <ItemContent>
                        <ItemTitle>No attendance records found</ItemTitle>
                    </ItemContent>
                </Item>
            </li>
        )
    }

    return (
        <div className="mb-4">
            <div className="flex flex-row items-center justify-between gap-2 mb-2">
                <h2 className="text-md text-muted-foreground font-medium">
                    Attendance
                </h2>
            </div>
            <ScrollArea className="max-h-[350px] w-full">
                <ul className="flex flex-col gap-2">{renderAttendances()}</ul>
            </ScrollArea>
        </div>
    )
}
