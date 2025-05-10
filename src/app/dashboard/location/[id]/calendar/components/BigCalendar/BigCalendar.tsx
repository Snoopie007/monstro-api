"use client";
import React, { useState } from 'react';
import { CalendarToolbar, MonthView, DayView, WeekView } from '.';
import { CalendarView, CalendarEvent } from '@/types';
import { useSessionCalendar } from '../../providers/SessionCalendarProvider';


interface BigCalendarProps {
    events: CalendarEvent[]
}


export function BigCalendar({
    events = [],
}: BigCalendarProps) {
    const { currentDate, setCurrentDate } = useSessionCalendar()
    const [view, setView] = useState<CalendarView>('month');

    const handleViewChange = (newView: CalendarView) => {
        setView(newView);
    };

    const handleNavigate = (date: Date) => {
        setCurrentDate(date);
    };

    return (
        <div className="flex flex-col">
            <CalendarToolbar
                date={currentDate}
                view={view}
                onViewChange={handleViewChange}
                onNavigate={handleNavigate}
            />
            <div className='pt-0 pb-2 px-2  flex-1 '>

                <div className='border overflow-hidden border-foreground/10 bg-background rounded-lg'>
                    {view === 'month' && (
                        <MonthView
                            events={events}
                            currentDate={currentDate}
                        />
                    )}
                    {view === 'day' && (
                        <DayView
                            events={events}
                            currentDate={currentDate}
                        />
                    )}
                    {view === 'week' && (
                        <WeekView
                            events={events}
                            currentDate={currentDate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
