"use client";
import { cn } from '@/libs/utils';
import { isSameDay, isSameMonth } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types';
import { useSessionCalendar } from '../../providers/SessionCalendarProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback, Button } from '@/components/ui';
import { Maximize2 } from 'lucide-react';

interface MonthViewProps {
    events?: CalendarEvent[];
    currentDate: Date;
}

export function MonthView({
    events = [],
    currentDate,
}: MonthViewProps) {
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days: Date[] = [];

        // Get first day of month and its weekday (0-6, where 0 is Sunday)
        const firstDayOfMonth = new Date(year, month, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay();

        // Add days from previous month to fill the first week
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();

        for (let i = 0; i < startingDayOfWeek; i++) {
            const day = prevMonthDays - startingDayOfWeek + i + 1;
            days.push(new Date(year, month - 1, day));
        }

        // Add all days of current month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        // Determine if we need 5 or 6 rows (weeks) - each row has 7 days
        const weeksNeeded = Math.ceil(days.length / 7);
        const totalDaysNeeded = weeksNeeded * 7;

        // Add days from next month to complete the grid
        const daysToAdd = totalDaysNeeded - days.length;
        for (let i = 1; i <= daysToAdd; i++) {
            days.push(new Date(year, month + 1, i));
        }

        setCalendarDays(days);
    }, [currentDate]);


    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-7  ">
                {weekdays.map((day, index) => (
                    <div key={day} className={cn(
                        "text-left px-4 text-sm font-medium py-2 border-b border-foreground/5 uppercase",
                        { "border-r": index < 6 }
                    )}>
                        {day}
                    </div>
                ))}
            </div>


            <div className="grid grid-cols-7 h-[calc(100vh-140px)]">
                {calendarDays.map((day, index) => (
                    <DayItem
                        key={index}
                        day={day}
                        currentDate={currentDate}
                        events={events}
                        isLastRow={Math.floor(index / 7) === 4} // Changed from 5 to 4 for 5 rows total
                        isLastColumn={(index + 1) % 7 === 0}
                    />
                ))}
            </div>

        </div>
    );
}

interface DayItemProps {
    day: Date;
    events: CalendarEvent[];
    onSelectEvent?: (event: CalendarEvent) => void;
    currentDate: Date;
    isLastRow: boolean;
    isLastColumn: boolean;
}

function DayItem({ day, events, currentDate, isLastRow, isLastColumn }: DayItemProps) {
    const today = new Date()
    const isToday = isSameDay(day, today);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const { setCurrentDate, setCurrentEvent, isLoading } = useSessionCalendar()

    // Get events for a specific day
    const getEventsForDay = (date: Date) => {
        return events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear();
        });
    };

    const dayEvents = getEventsForDay(day);

    return (
        <div
            className={cn(
                "p-1 relative bg-background border-foreground/5 group transition-colors cursor-pointer",
                "data-[month=false]:text-foreground/20 data-[month=false]:bg-foreground/5",
                { "border-b": !isLastRow },
                { "border-r": !isLastColumn }
            )}
            data-today={isToday}
            data-month={isCurrentMonth}

        >
            <div className="text-right flex flex-row justify-end  overflow-hidden">
                <span className={cn("inline-block size-6 text-center leading-6 transform transition-transform duration-200 group-hover:-translate-x-7",
                    "group-data-[today=true]:text-indigo-500 group-data-[today=true]:font-bold",
                )}>
                    {day.getDate()}
                </span>
                <div className='absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                    <Button variant='ghost' size='icon' className='size-5' onClick={() => setCurrentDate(day)}>
                        <Maximize2 className='size-3' />
                    </Button>
                </div>
            </div>



            <div className="overflow-hidden space-y-0.5 mt-1">
                {isLoading && isCurrentMonth ? (
                    <Skeleton className="h-4 w-full" />
                ) : (
                    dayEvents.slice(0, 3).map((event, i) => (
                        <EventItem key={event.id} event={event} onSelect={setCurrentEvent} />
                    ))
                )}
                {dayEvents.length > 5 && (
                    <div className="text-xs text-indigo-600 p-1 mb-1 truncate cursor-pointer">
                        +{dayEvents.length - 3} more
                    </div>
                )}
            </div>

        </div>
    );
}

interface EventItemProps {
    event: CalendarEvent;
    onSelect?: (event: CalendarEvent) => void;
}

function EventItem({ event, onSelect }: EventItemProps) {
    const members = event.data.members

    return (
        <div className="text-xs bg-foreground text-background border-l-3 flex-col border-indigo-500 rounded-sm py-1.5 px-2 truncate cursor-pointer"
            onClick={() => onSelect && onSelect(event)}
        >


            <div className="truncate overflow-hidden text-ellipsis font-medium">
                {event.title}
            </div>
            <div className="flex items-center">
                {members.length > 0 && members.slice(0, 2).map((m, i) => (
                    <Avatar key={m.memberId} className="size-4">
                        <AvatarImage src={`${m.avatar ? m.avatar : ""}`} alt={m.name} />
                        <AvatarFallback className="text-[0.6rem]  bg-background/50 text-primary-foreground  font-semibold">
                            {`${m.name.charAt(0)}`}
                        </AvatarFallback>
                    </Avatar>
                ))}
            </div>
        </div>
    )
}
