
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    Separator,
} from '@/components/ui'
import { cn } from '@/libs/utils'
import { formatDate } from 'date-fns'
import { Attendance } from '@/types'

export const MonthView = ({ weeks, month }: { weeks: any[], month: string }) => {
    return (
        <div className="flex-1">
            <div className="flex flex-col gap-1 w-full">
                <span className='text-sm font-medium w-full text-left uppercase text-muted-foreground/80'>{month}</span>
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-row gap-1 w-full">
                        {week.map((day: any, dayIndex: number) => (
                            <div key={dayIndex} className="flex-1 aspect-square" >
                                {day.isEmpty ? (
                                    <div className={cn(
                                        'size-full rounded-sm dark:border-slate-800 transition-colors duration-200 ',
                                        'dark:bg-slate-900/20 bg-transparent'
                                    )} />
                                ) : (
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <div
                                                className={cn(
                                                    'size-full rounded-sm dark:border-slate-800 cursor-pointer',
                                                    'transition-colors duration-200 border border-gray-200',
                                                    'hover:border-gray-400',
                                                    day.count === 0 &&
                                                    'dark:bg-[#0f172a] bg-[#ebedf0]',
                                                    day.count > 0 &&
                                                    'bg-indigo-700 dark:bg-indigo-500'
                                                )}
                                            />
                                        </HoverCardTrigger>
                                        <HoverCardContent >
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(day.date, 'PPP')}
                                            </div>
                                            {day.attendances.length > 0 && (
                                                <Separator className="mt-1 mb-2  bg-foreground/10" />
                                            )}
                                            {day.attendances.map((attendance: Attendance, index: number) => (
                                                <div key={index} className="flex flex-col gap-1 text-xs">
                                                    <div className=" flex flex-row gap-1 items-center justify-between " >
                                                        <span className="text-muted-foreground">program:</span>
                                                        <span className="text-foreground font-medium">
                                                            {attendance.programName || 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <div className=" flex flex-row gap-1 items-center justify-between " >
                                                        <span className="text-muted-foreground">started at:</span>
                                                        <span className="text-foreground font-medium">
                                                            {formatDate(attendance.startTime, 'hh:mm a')}
                                                        </span>
                                                    </div>
                                                    <div className=" flex flex-row gap-1 items-center justify-between " >
                                                        <span className="text-muted-foreground">checked in:</span>
                                                        <span className="text-foreground font-medium">
                                                            {formatDate(attendance.checkInTime, 'hh:mm a')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </HoverCardContent>
                                    </HoverCard>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
