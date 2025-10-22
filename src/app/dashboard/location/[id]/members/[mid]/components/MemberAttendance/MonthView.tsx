import { Item, ItemContent, ItemDescription } from '@/components/ui'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/libs/utils'
import { formatDate } from 'date-fns'

export const MonthView = ({ weeks }: { weeks: any[] }) => {
    return (
        <div className="flex-1">
            <div className="flex flex-col gap-1 w-full">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-row gap-1 w-full">
                        {week.map((day: any, dayIndex: number) => (
                            <div
                                key={dayIndex}
                                className="flex-1 aspect-square"
                            >
                                {day.isEmpty ? (
                                    <div
                                        className={cn(
                                            'w-full h-full rounded-sm dark:border-slate-800 transition-colors duration-200 ',
                                            'dark:bg-slate-900/20 bg-transparent'
                                        )}
                                    />
                                ) : (
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <div
                                                className={cn(
                                                    'w-full h-full rounded-sm dark:border-slate-800 cursor-pointer transition-colors duration-200 border border-gray-200 hover:border-gray-400',
                                                    day.count === 0 &&
                                                        'dark:bg-[#0f172a] bg-[#ebedf0]',
                                                    day.count > 0 &&
                                                        'bg-indigo-700 dark:bg-indigo-500'
                                                )}
                                            />
                                        </HoverCardTrigger>
                                        <HoverCardContent
                                            className={cn(
                                                'p-2',
                                                !day.attendances.length &&
                                                    'w-auto'
                                            )}
                                        >
                                            <span className="text-sm text-muted-foreground">
                                                {formatDate(day.date, 'PPP')}
                                            </span>
                                            <div
                                                className={cn(
                                                    'flex flex-col gap-2'
                                                )}
                                            >
                                                {day.attendances.map(
                                                    (
                                                        attendance: any,
                                                        index: number
                                                    ) => (
                                                        <Item
                                                            key={index}
                                                            variant="muted"
                                                            className="px-2 py-1 border-foreground/10"
                                                        >
                                                            <ItemContent>
                                                                <h4 className="text-sm font-medium">
                                                                    {
                                                                        attendance.programName
                                                                    }
                                                                </h4>

                                                                <ItemDescription>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {formatDate(
                                                                            attendance.startTime,
                                                                            'dd/MM/yyyy hh:mm a'
                                                                        )}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Checked
                                                                        in at:{' '}
                                                                        {formatDate(
                                                                            attendance.checkInTime,
                                                                            'hh:mm a'
                                                                        )}
                                                                    </span>
                                                                </ItemDescription>
                                                            </ItemContent>
                                                        </Item>
                                                    )
                                                )}
                                            </div>
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
