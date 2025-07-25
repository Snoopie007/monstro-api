"use client";
import React, { useState } from "react";
import { CalendarToolbar, MonthView, DayView, WeekView } from ".";
import { CalendarView, CalendarEvent } from "@/types";
import { useSessionCalendar } from "../../providers/SessionCalendarProvider";

interface BigCalendarProps {
  events: CalendarEvent[];
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function BigCalendar({
  events = [],
  view: externalView,
  onViewChange,
  onEventClick,
}: BigCalendarProps) {
  const { currentDate, setCurrentDate } = useSessionCalendar();
  const [internalView, setInternalView] = useState<CalendarView>("month");

  // Use external view if provided, otherwise use internal view
  const view = externalView || internalView;

  const handleViewChange = (newView: CalendarView) => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalView(newView);
    }
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
      <div className="pt-0 pb-2 px-2  flex-1 ">
        <div className="border overflow-hidden border-foreground/10 bg-background rounded-lg">
          {view === "month" && (
            <MonthView
              events={events}
              currentDate={currentDate}
              onEventClick={onEventClick}
            />
          )}
          {view === "day" && (
            <DayView
              events={events}
              currentDate={currentDate}
              onEventClick={onEventClick}
            />
          )}
          {view === "week" && (
            <WeekView
              events={events}
              currentDate={currentDate}
              onEventClick={onEventClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
