import React, { useEffect, useState } from 'react'
import { useSessionCalendar } from '../providers/SessionCalendarProvider'
import { format, isSameDay } from 'date-fns'
import { CalendarEvent } from '@/types/attendance'
import { ScrollArea } from '@/components/ui'
import { cn, tryCatch } from '@/libs/utils'
import { AddReservation } from './AddReservation'
import { Clock10 } from 'lucide-react'
import { decodeId } from '@/libs/server/sqids'



export function DayList({ lid, events }: { lid: string, events: CalendarEvent[] }) {
    const { currentDate, setCurrentDate, setIsLoading } = useSessionCalendar()
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
    }, [currentDate, events])

    const handleRemoveReservation = async (event: CalendarEvent, memberId: string) => {
        setIsLoading(true);

        try {
            // Validate required parameters
            if (!lid || !memberId || !event.data) {
                throw new Error('Missing required parameters');
            }

            const isRecurring = event.data.isRecurring;
            let url: string;

            if (isRecurring) {
                if (!event.data.recurringId) {
                    throw new Error('Missing recurringId for recurring reservation');
                }
                url = `/api/protected/loc/${lid}/members/${memberId}/reservations/${event.data.recurringId}/recurring?date=${format(event.start, 'yyyy-MM-dd')}`;
            } else {
                if (!event.data.reservationId) {
                    throw new Error('Missing reservationId for regular reservation');
                }
                url = `/api/protected/loc/${lid}/members/${memberId}/reservations/${event.data.reservationId}`;
            }

            // Using tryCatch pattern
            const { result, error } = await tryCatch(fetch(url, { method: 'DELETE' }));

            if (error || !result || !result.ok) {
                throw error || new Error('Failed to remove reservation');
            }

            // Optimistic UI update
            setClasses(prev => prev.map(evt => {
                if (evt.id === event.id) {
                    return {
                        ...evt,
                        data: {
                            ...evt.data,
                            members: evt.data.members.filter(m => String(m.memberId) !== String(memberId))
                        }
                    };
                }
                return evt;
            }));

        } catch (error) {
            console.error('Error removing reservation:', error);
            // You might want to add toast notification here
            // toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='bg-background rounded-lg border border-foreground/10 flex-1 h-full' >
            <div className='flex flex-col flex-1 h-full p-4 space-y-2'>
                <div className='text-sm font-semibold '>
                    Session for {today}
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
                                'rounded-sm px-3 py-2 flex flex-col gap-0.5'
                            )}>
                                <div className='flex flex-row items-center justify-between'>
                                    <span className='text-sm font-bold'>
                                        {c.title}
                                    </span>
                                    <AddReservation
                                        event={c}
                                        onRemoveReservation={(memberId) => handleRemoveReservation(c, memberId)}
                                        lid={lid}
                                       rid={c.data.reservationId ?? c.data.recurringId ?? 0}  
                                    />
                                </div>
                                <div className='flex flex-row items-center gap-2 text-xs'>
                                    <span className='text-muted-foreground flex flex-row items-center gap-1'>
                                        <Clock10 className='size-3' />
                                        <span>{format(c.start, 'h:mm a')} - {format(c.end, 'h:mm a')}</span>
                                    </span>
                                    <span> / </span>
                                    <span className='text-muted-foreground'>
                                        {c.data.members.length} member(s)
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
