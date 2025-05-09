"use client";
import React, { useState } from 'react';
import { CalendarToolbar, MonthView, DayView, WeekView } from '.';
import { CalendarView, CalendarEvent } from '@/types';


interface BigCalendarProps {
    events: CalendarEvent[];
    selectedDay: Date;
}


export function BigCalendar({
    events = [],
    selectedDay,
}: BigCalendarProps) {
    const [currentDate, setCurrentDate] = useState(selectedDay);
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

            <div className='flex-1 h-full'>
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
    );
}
