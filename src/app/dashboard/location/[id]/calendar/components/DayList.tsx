import React, { useEffect, useState } from 'react'
import { useSessionCalendar } from '../providers/SessionCalendarProvider'
import { format, isSameDay } from 'date-fns'
import { CalendarEvent } from '@/types/attendance'
import { ScrollArea } from '@/components/ui'



export function DayList({ lid, events }: { lid: string, events: CalendarEvent[] }) {
    // const { currentDate, setCurrentDate, } = useSessionCalendar()
    // const [classes, setClasses] = useState<CalendarEvent[]>([])


    // useEffect(() => {

    //     if (events) {
    //         const classes = events.filter((event) => isSameDay(event.start, currentDate))

    //         setClasses(classes)
    //     }
    // }, [ currentDate])

    return (
        <div className='bg-background rounded-lg border border-foreground/10 flex-1 h-full' >
            {/* <div className='flex flex-col flex-1 h-full p-4 space-y-2'>
                <div className='text-base font-semibold   '>
                    Classes for {format(currentDate, 'MMMM d, yyyy')}
                </div>

                <ScrollArea className='h-full'>
                    <div className='flex flex-col gap-2'>
                        {classes.map((event) => (
                            <div key={event.id} className='border border-foreground/10 bg-foreground/5 rounded-sm px-4 py-3'>
                                <div className='text-sm font-medium'>{event.title}</div>
                                <div className='text-xs text-foreground/50'>{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div> */}
        </div>
    )
}
