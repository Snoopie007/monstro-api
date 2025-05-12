import React, { useEffect, useState } from 'react'
import { useSessionCalendar } from '../providers/SessionCalendarProvider'
import { format, isSameDay } from 'date-fns'
import { CalendarEvent } from '@/types/attendance'
import { ScrollArea } from '@/components/ui'
import { cn } from '@/libs/utils'



export function DayList({ lid, events }: { lid: string, events: CalendarEvent[] }) {
    const { currentDate, setCurrentDate, } = useSessionCalendar()
    const [classes, setClasses] = useState<CalendarEvent[]>([])


    useEffect(() => {

        if (events) {
            const classes = events.filter((event) => isSameDay(event.start, currentDate))

            setClasses(classes)
        }

    }, [currentDate])



    return (
        <div className='bg-background rounded-lg border border-foreground/10 flex-1 h-full' >
            <div className='flex flex-col flex-1 h-full p-4 space-y-2'>
                <div className='text-sm font-semibold  border-b border-foreground/10 pb-1'>
                    {currentDate ? `Classes for ${format(currentDate, 'MMMM d, yyyy')}` : 'Loading...'}
                </div>

                <ScrollArea className='h-full'>
                    <div className='flex flex-col gap-2'>
                        {classes.map((c) => (
                            <div key={c.id} className={cn(
                                'border border-foreground/10 bg-foreground/5  text-xs',
                                'rounded-sm px-3 py-2 flex  flex-col'
                            )}>
                                <div className=' font-bold'>
                                    {c.title}
                                </div>
                                <div className='text-muted-foreground'>
                                    {format(c.start, 'h:mm a')} - {format(c.end, 'h:mm a')}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}
