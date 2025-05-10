"use client";
import { ScrollArea } from '@/components/ui';
import { cn } from '@/libs/utils';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import React, { useMemo, memo } from 'react';
import { CurrentTimeLine } from '.';
import { CalendarEvent } from '@/types';
import { useSessionCalendar } from '../../providers/SessionCalendarProvider';

interface WeekViewProps {
    events?: CalendarEvent[];
    currentDate: Date;
}

export function WeekView({ events = [], currentDate }: WeekViewProps) {

    const weekDays = useMemo(() => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [currentDate]);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

    const processedEvents = useMemo(() => {
        return events.map(event => {
            const heightInPixels = Math.max(Math.floor(event.duration * 60 / 60), 30); // 60px per hour, minimum 30px

            return {
                ...event,
                heightInPixels,
                minuteOffset: event.duration / 60 * 100
            };
        });
    }, [events]);



    const isTodayVisible = useMemo(() =>
        weekDays.some(day => isToday(day)),
        [weekDays]
    );

    return (
        <div className="w-full h-full flex flex-col">

            <div className="grid grid-cols-8 border-b border-foreground/10 h-14 flex-initial">
                <div className="border-r border-foreground/10 p-2 text-left text-xs font-semibold uppercase ">
                    Time
                </div>
                {weekDays.map((day, index) => (
                    <div key={index}
                        className={cn("py-2 px-4 text-left font-medium text-xs",
                            isToday(day) ? "text-indigo-500" : "text-foreground",
                            index < 6 && "border-r border-foreground/10"
                        )}
                    >
                        <div className='font-semibold uppercase'>{format(day, 'EEE')}</div>
                        <div className='text-foreground/60'>{format(day, 'MMM d')}</div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-hidden">
                <ScrollArea className='h-[calc(100vh-160px)]'>

                    <div className="grid grid-cols-8 relative">
                        {isTodayVisible && isToday(currentDate) && <CurrentTimeLine />}
                        {hours.map((hour, hourIndex) => (
                            <MemoizedHourRow
                                key={hour}
                                hour={hour}
                                hourIndex={hourIndex}
                                weekDays={weekDays}
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


type ProcessedEvent = CalendarEvent & { heightInPixels: number; minuteOffset: number }

interface HourRowProps {
    hour: number;
    hourIndex: number;
    weekDays: Date[];
    totalHours: number;
    processedEvents: ProcessedEvent[];
}

// Base HourRow component
function HourRow({
    hour,
    hourIndex,
    weekDays,
    totalHours,
    processedEvents
}: HourRowProps) {
    const { setCurrentEvent } = useSessionCalendar();
    const hourLabel = useMemo(() =>
        format(new Date().setHours(hour, 0), 'h a'),
        [hour]
    );

    return (
        <React.Fragment>
            <div className={cn("border-r p-2 text-sm text-foreground/60 border-foreground/10",
                hourIndex < totalHours - 1 && "border-b")}
            >
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
                    <div key={di} className={cn("relative min-h-[60px] ",
                        di < 6 && "border-r border-foreground/10",
                        hourIndex < totalHours - 1 && "border-b border-foreground/10",
                        isTodayCell ? "bg-foreground/10" : "bg-background"
                    )} >
                        {dayEvents.map((event) => {

                            return (
                                <WeekEvenItem
                                    key={event.id}
                                    event={event}
                                    onSelect={setCurrentEvent}
                                    position={{
                                        top: event.minuteOffset,
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
        prevProps.processedEvents === nextProps.processedEvents
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