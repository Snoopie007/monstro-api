import React, { useEffect, useState } from 'react'
import { useSessionCalendar } from '../providers/SessionCalendarProvider'
import { format, isSameDay } from 'date-fns'
import { CalendarEvent } from '@/types/attendance'
import { ScrollArea } from '@/components/ui'
import { cn } from '@/libs/utils'
import { AddReservation } from './AddReservation'
import { Clock10 } from 'lucide-react'



export function DayList({ lid, events }: { lid: string, events: CalendarEvent[] }) {
    const { currentDate, setCurrentDate, } = useSessionCalendar()
    const [classes, setClasses] = useState<CalendarEvent[]>([])
    const [today, setToday] = useState<string>('')

    useEffect(() => {

        if (events) {
            const classes = events.filter((event) => isSameDay(event.start, currentDate))
            setClasses(classes)
        }

        if (currentDate) {
            setToday(format(currentDate, 'MMMM d, yyyy'))
        }

    }, [currentDate])



    return (
        <div className='bg-background rounded-lg border border-foreground/10 flex-1 h-full' >
            <div className='flex flex-col flex-1 h-full p-4 space-y-2'>
                <div className='text-sm font-semibold '>
                    Reservations for {today}
                </div>

                <ScrollArea className='h-full'>
                    <div className='flex flex-col gap-2'>
                        {classes.length === 0 && (
                            <div className='text-muted-foreground border border-foreground/10 bg-foreground/5 text-xs rounded-sm px-3 py-2 flex items-center justify-center'>
                                No reservations found.
                            </div>
                        )}
                        {classes.map((c) => (
                            <div key={c.id} className={cn(
                                'border border-foreground/10 bg-foreground/5 ',
                                'rounded-sm px-3 py-2 flex  flex-col gap-0.5'
                            )}>
                                <div className='flex flex-row items-center justify-between'>
                                    <span className='text-sm font-bold'>
                                        {c.title}
                                    </span>
                                    <AddReservation />
                                </div>

                                <div className='flex flex-row items-center gap-2 text-xs'>
                                    <span className='text-muted-foreground flex flex-row items-center gap-1'>
                                        <Clock10 className='size-3' />
                                        <span>{format(c.start, 'h:mm a')} - {format(c.end, 'h:mm a')}</span>
                                    </span>
                                    <span> / </span>
                                    <span className='text-muted-foreground'>
                                        {c.data.members.length}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
