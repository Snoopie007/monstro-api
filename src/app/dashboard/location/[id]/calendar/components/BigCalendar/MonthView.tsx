"use client";
import { cn } from '@/libs/utils';
import { isSameDay, isSameMonth } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types';
import { useSessionCalendar } from '../../providers/SessionCalendarProvider';


interface MonthViewProps {
    events?: CalendarEvent[];
    currentDate: Date;
}

export function MonthView({
    events = [],
    currentDate,
}: MonthViewProps) {
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);
    const { setCurrentEvent } = useSessionCalendar()
    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days: Date[] = [];

        const firstDayOfMonth = new Date(year, month, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay();


        if (startingDayOfWeek > 0) {
            const prevMonth = new Date(year, month, 0);
            const prevMonthDays = prevMonth.getDate();

            for (let i = prevMonthDays - startingDayOfWeek + 1; i <= prevMonthDays; i++) {
                days.push(new Date(year, month - 1, i));
            }
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }


        const remainingDays = 35 - days.length; // Changed from 42 to 35 to have 5 weeks instead of 6
        for (let i = 1; i <= remainingDays; i++) {
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
                        onSelectEvent={setCurrentEvent}
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

function DayItem({
    day,
    events,
    onSelectEvent,
    currentDate,
    isLastRow,
    isLastColumn,
}: DayItemProps) {
    const today = new Date()
    const isToday = isSameDay(day, today);
    const isCurrentMonth = isSameMonth(day, currentDate);

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
        <div className={cn(
            "p-1 relative bg-background border-foreground/5",
            { "text-indigo-500": isToday, "bg-foreground/10 text-foreground/20": !isCurrentMonth },
            { "border-b": !isLastRow },
            { "border-r": !isLastColumn }
        )} >
            <div className="text-right p-1">
                <span className={cn("inline-block size-6 text-center leading-6",)}>
                    {day.getDate()}
                </span>
            </div>


            <div className="overflow-hidden space-y-0.5">
                {dayEvents.slice(0, 5).map((event, i) => (
                    <EventItem key={event.id} event={event} onSelect={onSelectEvent} />
                ))}
                {dayEvents.length > 5 && (
                    <div className="text-xs text-indigo-600 p-1 mb-1 truncate cursor-pointer">
                        +{dayEvents.length - 5} more
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
    return (
        <div
            className="text-xs bg-foreground text-background border-l-3 border-indigo-500 rounded-sm py-1 px-2 truncate cursor-pointer"
            onClick={() => onSelect && onSelect(event)}
        >
            ({event.data?.reservationCounts as number || 0}) {event.title}
        </div>
    )
}
