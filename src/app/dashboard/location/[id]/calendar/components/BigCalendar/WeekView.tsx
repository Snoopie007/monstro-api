"use client";
import { ScrollArea } from "@/components/ui";
import { cn } from "@/libs/utils";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import React, { useMemo, memo } from "react";
import { CurrentTimeLine } from ".";
import { CalendarEvent } from "@/types";
import { useSessionCalendar } from "../../providers/SessionCalendarProvider";

interface WeekViewProps {
  events?: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function WeekView({
  events = [],
  currentDate,
  onEventClick,
}: WeekViewProps) {
  const { setCurrentEvent } = useSessionCalendar();
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const processedEvents = useMemo(() => {
    // First, process all events with basic positioning
    const basicEvents = events.map((event) => {
      const height = Math.max(event.duration, 30);
      const start = new Date(event.start);
      const top = start.getHours() * 60 + start.getMinutes();
      const endPosition = top + height;

      // Create a date key for grouping (YYYY-MM-DD format)
      const dateKey = `${start.getFullYear()}-${String(
        start.getMonth()
      ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

      return {
        ...event,
        height,
        top,
        endPosition,
        dateKey,
      };
    });

    // Type for events with positioning data
    type BasicEvent = (typeof basicEvents)[0];
    type EventWithPosition = BasicEvent & {
      columnIndex: number;
      totalColumns: number;
    };

    // Group events by actual calendar date instead of day of week
    const eventsByDate = new Map<string, BasicEvent[]>();

    // Group events by actual calendar date
    basicEvents.forEach((event) => {
      if (!eventsByDate.has(event.dateKey)) {
        eventsByDate.set(event.dateKey, []);
      }
      eventsByDate.get(event.dateKey)!.push(event);
    });

    // Process each date's events for overlap detection
    const finalEvents: EventWithPosition[] = [];
    const processedEventIds = new Set<string>();

    for (const [dateKey, dateEvents] of eventsByDate) {
      // Sort events by start time
      const sortedDateEvents = [...dateEvents].sort((a, b) => a.top - b.top);

      if (sortedDateEvents.length === 0) continue;

      const result: EventWithPosition[] = [];

      for (let i = 0; i < sortedDateEvents.length; i++) {
        const currentEvent = sortedDateEvents[i];

        // Skip if we've already processed this event (shouldn't happen, but safety check)
        if (processedEventIds.has(currentEvent.id)) {
          console.warn(
            `Duplicate event detected: ${currentEvent.id} on date ${dateKey}`
          );
          continue;
        }

        // Find all events that overlap with the current event on the same date
        const overlappingEvents = sortedDateEvents.filter((otherEvent, j) => {
          if (i === j) return false;
          // Check if events overlap
          return (
            currentEvent.top < otherEvent.endPosition &&
            currentEvent.endPosition > otherEvent.top
          );
        });

        // Find the first available column
        const usedColumns = new Set<number>();

        // Check which columns are already used by overlapping events that we've already processed
        overlappingEvents.forEach((overlappingEvent) => {
          const processedEvent = result.find(
            (e) => e.id === overlappingEvent.id
          );
          if (processedEvent) {
            usedColumns.add(processedEvent.columnIndex);
          }
        });

        // Find the first available column starting from 0
        let columnIndex = 0;
        while (usedColumns.has(columnIndex)) {
          columnIndex++;
        }

        result.push({
          ...currentEvent,
          columnIndex,
          totalColumns: 1, // Will be updated below
        });

        // Mark this event as processed
        processedEventIds.add(currentEvent.id);
      }

      // Update totalColumns for all events in each overlap group to be consistent
      const finalDateEvents = result.map((event) => {
        const overlappingEvents = result.filter((otherEvent) => {
          if (event.id === otherEvent.id) return false;
          return (
            event.top < otherEvent.endPosition &&
            event.endPosition > otherEvent.top
          );
        });

        // Find the maximum column index in this overlap group
        const maxColumnIndex = Math.max(
          event.columnIndex,
          ...overlappingEvents.map((e) => e.columnIndex)
        );

        return {
          ...event,
          totalColumns: maxColumnIndex + 1,
        };
      });

      finalEvents.push(...finalDateEvents);
    }

    return finalEvents;
  }, [events]);

  const isTodayVisible = useMemo(
    () => weekDays.some((day) => isToday(day)),
    [weekDays]
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="grid grid-cols-8 border-b border-foreground/10 h-14 flex-initial">
        <div className="border-r border-foreground/10 p-2 text-left text-xs font-semibold uppercase ">
          Time
        </div>
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={cn(
              "py-2 px-4 text-left font-medium text-xs",
              isToday(day) ? "text-indigo-500" : "text-foreground",
              index < 6 && "border-r border-foreground/10"
            )}
          >
            <div className="font-semibold uppercase">{format(day, "EEE")}</div>
            <div className="text-foreground/60">{format(day, "MMM d")}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="relative">
            {/* Hour grid */}
            <div className="grid grid-cols-8">
              {hours.map((hour, hourIndex) => (
                <MemoizedHourRow
                  key={hour}
                  hour={hour}
                  hourIndex={hourIndex}
                  weekDays={weekDays}
                  totalHours={hours.length}
                  onEventClick={onEventClick}
                />
              ))}
            </div>

            {/* Events overlay */}
            <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
              {/* Time column - no events */}
              <div className="pointer-events-none" />

              {/* Day columns with events */}
              {weekDays.map((day, di) => {
                const dayEvents = processedEvents.filter((event) => {
                  const eventDate = new Date(event.start);
                  return (
                    eventDate.getFullYear() === day.getFullYear() &&
                    eventDate.getMonth() === day.getMonth() &&
                    eventDate.getDate() === day.getDate()
                  );
                });

                return (
                  <div key={di} className="relative pointer-events-none h-full">
                    {dayEvents.map((event) => {
                      // Calculate positioning for overlapping events
                      const availableWidth = 100; // Use percentage for responsive width
                      const eventWidth = availableWidth / event.totalColumns;
                      const leftOffset = event.columnIndex * eventWidth;

                      return (
                        <div
                          key={event.id}
                          className="absolute pointer-events-auto"
                          style={{
                            top: `${event.top}px`,
                            height: `${event.height}px`,
                            left: `${leftOffset}%`,
                            width: `${eventWidth - 1}%`, // Subtract 1% for spacing between events
                            zIndex: 10,
                          }}
                          onClick={() =>
                            onEventClick
                              ? onEventClick(event)
                              : setCurrentEvent(event)
                          }
                        >
                          <div
                            className={cn(
                              "border-0 border-l-4 border-indigo-500 text-xs rounded-xs cursor-pointer h-full",
                              "text-foreground py-0.5 px-1",
                              "bg-background hover:bg-foreground/10 transition-colors shadow-sm"
                            )}
                          >
                            <div className="font-medium truncate text-foreground">
                              {event.title}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Current time line */}
            {isTodayVisible && <CurrentTimeLine />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

type ProcessedEvent = CalendarEvent & { height: number; top: number };

interface HourRowProps {
  hour: number;
  hourIndex: number;
  weekDays: Date[];
  totalHours: number;
  onEventClick?: (event: CalendarEvent) => void;
}

// Base HourRow component
function HourRow({
  hour,
  hourIndex,
  weekDays,
  totalHours,
  onEventClick,
}: HourRowProps) {
  const hourLabel = useMemo(
    () => format(new Date().setHours(hour, 0), "h a"),
    [hour]
  );

  return (
    <React.Fragment>
      <div
        className={cn(
          "border-r p-2 text-sm text-foreground/60 border-foreground/10",
          hourIndex < totalHours - 1 && "border-b"
        )}
      >
        {hourLabel}
      </div>

      {weekDays.map((day, di) => {
        const isTodayCell = isToday(day);

        return (
          <div
            key={di}
            className={cn(
              " min-h-[60px] ",
              { "border-r border-foreground/10": di < 6 },
              { "border-b border-foreground/10": hourIndex < totalHours - 1 },
              { "bg-foreground/10": isTodayCell }
            )}
          />
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
    prevProps.onEventClick === nextProps.onEventClick
  );
});
