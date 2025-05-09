"use client";
import { ScrollArea } from '@/components/ui';
import { cn } from '@/libs/utils';
import { format, startOfWeek, addDays, isToday, differenceInMinutes } from 'date-fns';
import React, { useMemo, useCallback, memo } from 'react';
import { CurrentTimeLine } from '.';
import { CalendarEvent } from '@/types';

interface WeekViewProps {
    events?: CalendarEvent[];
    onSelectEvent?: (event: CalendarEvent) => void;
    currentDate: Date;
}

export function WeekView({ events = [], onSelectEvent, currentDate }: WeekViewProps) {

    const weekDays = useMemo(() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [currentDate]);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

    const processedEvents = useMemo(() => {
        return events.map(event => {
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const durationInMinutes = differenceInMinutes(endDate, startDate);
            const heightInPixels = Math.max(Math.floor(durationInMinutes * 60 / 60), 30); // 60px per hour, minimum 30px

            return {
                ...event,
                day: startDate.getDay(),
                hour: startDate.getHours(),
                minute: startDate.getMinutes(),
                durationInMinutes,
                heightInPixels
            };
        });
    }, [events]);

    const getEventsForDay = useCallback((date: Date, hour: number) => {
        return processedEvents.filter(event => {
            const eventDay = new Date(event.start).getDay();
            const eventHour = new Date(event.start).getHours();
            return date.getDay() === eventDay && eventHour === hour;
        });
    }, [processedEvents]);

    const isTodayVisible = useMemo(() =>
        weekDays.some(day => isToday(day)),
        [weekDays]
    );

    return (
        <div className="w-full h-full flex flex-col">

            <div className="grid grid-cols-8 border-b h-14 flex-initial">
                <div className="border-r p-2 text-left text-xs font-semibold uppercase text-foreground/80">
                    Time
                </div>
                {weekDays.map((day, index) => (
                    <div key={index}
                        className={cn("py-2 px-4 text-left font-medium text-xs",
                            isToday(day) ? "text-indigo-500" : "text-foreground/80",
                            index < 6 && "border-r"
                        )}
                    >
                        <div className='font-semibold uppercase'>{format(day, 'EEE')}</div>
                        <div>{format(day, 'MMM d')}</div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-hidden">
                <ScrollArea className='h-[calc(100vh-152px)]'>
                    <div className="grid grid-cols-8 relative">
                        {/* Current time line - only render if today is visible */}
                        {isTodayVisible && isToday(currentDate) && <CurrentTimeLine />}

                        {hours.map((hour, hourIndex) => (
                            <MemoizedHourRow
                                key={hour}
                                hour={hour}
                                hourIndex={hourIndex}
                                weekDays={weekDays}
                                getEventsForDay={getEventsForDay}
                                onSelectEvent={onSelectEvent}
                                totalHours={hours.length}
                                processedEvents={processedEvents}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

interface HourRowProps {
    hour: number;
    hourIndex: number;
    weekDays: Date[];
    getEventsForDay: (date: Date, hour: number) => any[];
    onSelectEvent?: (event: CalendarEvent) => void;
    totalHours: number;
    processedEvents: any[];
}

// Base HourRow component
function HourRow({
    hour,
    hourIndex,
    weekDays,
    getEventsForDay,
    onSelectEvent,
    totalHours,
    processedEvents
}: HourRowProps) {
    // Pre-format the hour label to avoid doing it in render
    const hourLabel = useMemo(() =>
        format(new Date().setHours(hour, 0), 'h a'),
        [hour]
    );

    return (
        <React.Fragment>
            <div className={cn("border-r p-2 text-sm text-gray-500", hourIndex < totalHours - 1 && "border-b")}>
                {hourLabel}
            </div>

            {weekDays.map((day, di) => {
                // Pre-filter events for this day and hour
                const dayEvents = useMemo(() =>
                    processedEvents.filter(event => {
                        const eventDay = new Date(event.start).getDay();
                        const eventHour = new Date(event.start).getHours();
                        return day.getDay() === eventDay && eventHour === hour;
                    }),
                    [processedEvents, day, hour]
                );

                const isTodayCell = isToday(day);

                return (
                    <div key={di}
                        className={cn(
                            "relative min-h-[60px]",
                            di < 6 && "border-r",
                            hourIndex < totalHours - 1 && "border-b",
                            isTodayCell ? "bg-indigo-50" : "bg-white"
                        )}
                    >
                        {dayEvents.map((event, ei) => {
                            const minuteOffset = event.minute / 60 * 100; // Convert to percentage of hour

                            return (
                                <WeekEvenItem
                                    key={event.id}
                                    event={event}
                                    onSelect={onSelectEvent}
                                    position={{
                                        top: minuteOffset,
                                        height: event.heightInPixels
                                    }}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </React.Fragment>
    );
}

// Memoize the HourRow component to prevent unnecessary re-renders
const MemoizedHourRow = memo(HourRow, (prevProps, nextProps) => {
    // Custom comparison function to determine if the component should re-render
    return (
        prevProps.hour === nextProps.hour &&
        prevProps.hourIndex === nextProps.hourIndex &&
        prevProps.totalHours === nextProps.totalHours &&
        prevProps.weekDays === nextProps.weekDays &&
        prevProps.processedEvents === nextProps.processedEvents &&
        prevProps.onSelectEvent === nextProps.onSelectEvent
    );
});


interface WeekEvenItemProps {
    event: CalendarEvent;
    onSelect?: (event: CalendarEvent) => void;
    position: {
        top: number,
        height: number,
    };
}



function WeekEvenItem({ event, onSelect, position }: WeekEvenItemProps) {

    // Pre-format event times
    const eventTimeLabel = useMemo(() =>
        `${format(new Date(event.start), 'h:mm a')} - ${format(new Date(event.end), 'h:mm a')}`,
        [event.start, event.end]
    );
    return (
        <div
            className="absolute"
            style={{
                top: `${position.top}%`,
                height: `${position.height}px`,
                zIndex: 10
            }}
            onClick={() => onSelect && onSelect(event)}
        >
            <div className='border-l-3 border-indigo-500 text-xs rounded-sm cursor-pointer bg-foreground text-background p-2'>
                <div className="font-medium text-sm truncate">{event.title}</div>
                <div className="text-[10px] truncate">
                    {eventTimeLabel}
                </div>
            </div>

        </div>
    )
}