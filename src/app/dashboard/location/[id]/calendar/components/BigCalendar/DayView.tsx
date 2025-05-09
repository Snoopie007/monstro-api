"use client";
import { cn } from '@/libs/utils';
import { isSameDay, format, isToday } from 'date-fns';
import React, { useMemo } from 'react';
import { CalendarEvent } from '@/types';
import { ScrollArea } from '@/components/ui';
import { useSessionCalendar } from '../../providers/SessionCalendarProvider';
import { CurrentTimeLine } from './CurrentTimeLine';

interface DayViewProps {
    events?: CalendarEvent[];
    currentDate: Date;
}


export function DayView({ events = [], currentDate }: DayViewProps) {
    const { setCurrentEvent } = useSessionCalendar();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Process events to include positioning data
    const processedEvents = useMemo(() => {
        return events
            .filter(event => isSameDay(new Date(event.start), currentDate))
            .map(event => {
                const startDate = new Date(event.start);
                const hour = startDate.getHours();
                const minute = startDate.getMinutes();
                const heightInPixels = Math.max(event.duration, 30);
                const topPosition = hour * 60 + minute + hour;

                return {
                    ...event,
                    heightInPixels,
                    topPosition
                };
            }).sort((a, b) => a.topPosition - b.topPosition);
    }, [events, currentDate]);

    const isCurrentDay = isToday(currentDate);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
                <ScrollArea className='h-[calc(100vh-96px)]'>
                    <div className="relative">
                        {isCurrentDay && <CurrentTimeLine />}

                        {hours.map((hour) => (
                            <div key={hour} className="flex border-b min-h-[60px]">
                                <div className="w-[60px] flex-shrink-0 p-2 text-xs text-foreground/60 border-r">
                                    {format(new Date().setHours(hour, 0), 'h a')}
                                </div>
                                <div className="flex-grow relative h-[60px]"></div>
                            </div>
                        ))}

                        {/* Overlay events on top of the time grid */}
                        {processedEvents.map((event) => (
                            <DayEventItem
                                key={event.id}
                                event={event}
                                onSelect={setCurrentEvent}
                                position={{
                                    top: event.topPosition,
                                    height: event.heightInPixels
                                }}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

interface DayEventItemProps {
    event: CalendarEvent;
    onSelect: (event: CalendarEvent) => void;
    position: {
        top: number;
        height: number;
    };
}

function DayEventItem({ event, onSelect, position }: DayEventItemProps) {
    return (
        <div
            className={"absolute"}
            style={{
                top: `${position.top}px`,
                height: `${position.height}px`,
                left: `60px`,
            }}
            onClick={() => onSelect(event)}
        >
            <div className={cn(
                "flex flex-row w-full max-w-[300px] bg-foreground text-background border-l-3 border-indigo-600 p-2 items-center rounded-sm ",
                "cursor-pointer hover:bg-indigo-500 hover:text-white group transition-colors"
            )}>
                <span className='font-medium text-sm '>
                    ({event.data?.reservationCounts as number || 0}) {event.title}
                </span>
            </div>

        </div>
    );
}