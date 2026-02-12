"use client";

import React, { useMemo } from "react";
import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachHourOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
} from "date-fns";

import {
  DraggableEvent,
  DroppableCell,
  EventItem,
  WeekCellsHeight,
} from "../event-calendar";
import type { CalendarEvent, ClosedDate } from "@subtrees/types";
import { EndHour, StartHour } from "./constants";
import { cn } from "@/libs/utils";
import { useCurrentTimeIndicator } from "@/hooks";
import { isMultiDayEvent } from "@/libs/calendar";
import { CalendarX, Wrench } from "lucide-react";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  closedDates?: ClosedDate[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

const closedOverlayStyle = cn(
  "bg-gray-100 dark:bg-gray-800/50",
  "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.03)_4px,rgba(0,0,0,0.03)_8px)]",
  "dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]"
);

export function DayView({
  currentDate,
  events,
  closedDates = [],
  onEventSelect,
  onEventCreate,
}: DayViewProps) {
  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    });
  }, [currentDate]);

  const dayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          isSameDay(currentDate, eventStart) ||
          isSameDay(currentDate, eventEnd) ||
          (currentDate > eventStart && currentDate < eventEnd)
        );
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
  }, [currentDate, events]);

  // Filter all-day events
  const allDayEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Include explicitly marked all-day events or multi-day events
      return event.allDay || isMultiDayEvent(event);
    });
  }, [dayEvents]);

  // Get only single-day time-based events
  const timeEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Exclude all-day events and multi-day events
      return !event.allDay && !isMultiDayEvent(event);
    });
  }, [dayEvents]);

  // Process events to calculate positions
  const positionedEvents = useMemo(() => {
    const result: PositionedEvent[] = [];
    const dayStart = startOfDay(currentDate);

    // Sort events by start time and duration
    const sortedEvents = [...timeEvents].sort((a, b) => {
      const aStart = new Date(a.start);
      const bStart = new Date(b.start);
      const aEnd = new Date(a.end);
      const bEnd = new Date(b.end);

      // First sort by start time
      if (aStart < bStart) return -1;
      if (aStart > bStart) return 1;

      // If start times are equal, sort by duration (longer events first)
      const aDuration = differenceInMinutes(aEnd, aStart);
      const bDuration = differenceInMinutes(bEnd, bStart);
      return bDuration - aDuration;
    });

    // Track columns for overlapping events
    const columns: { event: CalendarEvent; end: Date }[][] = [];

    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Adjust start and end times if they're outside this day
      const adjustedStart = isSameDay(currentDate, eventStart)
        ? eventStart
        : dayStart;
      const adjustedEnd = isSameDay(currentDate, eventEnd)
        ? eventEnd
        : addHours(dayStart, 24);

      // Calculate top position and height
      const startHour =
        getHours(adjustedStart) + getMinutes(adjustedStart) / 60;
      const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60;
      const top = (startHour - StartHour) * WeekCellsHeight;
      const height = (endHour - startHour) * WeekCellsHeight;

      // Find a column for this event
      let columnIndex = 0;
      let placed = false;

      while (!placed) {
        const col = columns[columnIndex] || [];
        if (col.length === 0) {
          columns[columnIndex] = col;
          placed = true;
        } else {
          const overlaps = col.some((c) =>
            areIntervalsOverlapping(
              { start: adjustedStart, end: adjustedEnd },
              { start: new Date(c.event.start), end: new Date(c.event.end) }
            )
          );
          if (!overlaps) {
            placed = true;
          } else {
            columnIndex++;
          }
        }
      }

      // Ensure column is initialized before pushing
      const currentColumn = columns[columnIndex] || [];
      columns[columnIndex] = currentColumn;
      currentColumn.push({ event, end: adjustedEnd });

      // First column takes full width, others are indented by 10% and take 90% width
      const width = columnIndex === 0 ? 1 : 0.9;
      const left = columnIndex === 0 ? 0 : columnIndex * 0.1;

      result.push({
        event,
        top,
        height,
        left,
        width,
        zIndex: 10 + columnIndex, // Higher columns get higher z-index
      });
    });

    return result;
  }, [currentDate, timeEvents]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const showAllDaySection = allDayEvents.length > 0;
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "day"
  );

  const closedDate = closedDates.find(
    c => c.date.slice(0, 10) === format(currentDate, 'yyyy-MM-dd')
  );
  const isClosed = !!closedDate;

  return (
    <div data-slot="day-view" className="contents">
      {isClosed && (
        <div className={cn(
          "px-4 py-3 border-b flex items-center gap-3",
          closedDate.type === 'holiday' 
            ? "bg-amber-500/10 border-amber-500/30" 
            : "bg-blue-500/10 border-blue-500/30"
        )}>
          {closedDate.type === 'holiday' ? (
            <CalendarX className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <Wrench className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-medium text-sm",
              closedDate.type === 'holiday' 
                ? "text-amber-700 dark:text-amber-300" 
                : "text-blue-700 dark:text-blue-300"
            )}>
              Location Closed
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {closedDate.reason}
              {dayEvents.length > 0 && ` • ${dayEvents.length} session${dayEvents.length > 1 ? 's' : ''} cancelled`}
            </p>
          </div>
        </div>
      )}
      {showAllDaySection && (
        <div className="border-foreground/10 dark:border-border/10 bg-muted/50 border-t">
          <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
            <div className="relative">
              <span className="text-muted-foreground/70 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            <div className="border-foreground/10 dark:border-border/10 relative border-r p-1 last:border-r-0">
              {allDayEvents.map((event) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const isFirstDay = isSameDay(currentDate, eventStart);
                const isLastDay = isSameDay(currentDate, eventEnd);

                return (
                  <EventItem
                    key={`spanning-${event.id}`}
                    onClick={(e) => handleEventClick(event, e)}
                    event={event}
                    view="month"
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                  >
                    {/* Always show the title in day view for better usability */}
                    <div>{event.title}</div>
                  </EventItem>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "grid flex-1 grid-cols-[3rem_1fr] overflow-auto sm:grid-cols-[4rem_1fr]",
        isClosed && closedOverlayStyle
      )}>
        <div className="border-foreground/10 dark:border-border/10 border-r">
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-foreground/10 dark:border-border/10 relative h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a")}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Positioned events */}
          {positionedEvents.map((positionedEvent) => (
            <div
              key={positionedEvent.event.id}
              className={cn(
                "absolute z-10 px-0.5",
                isClosed && "opacity-40 pointer-events-none"
              )}
              style={{
                top: `${positionedEvent.top}px`,
                height: `${positionedEvent.height}px`,
                left: `${positionedEvent.left * 100}%`,
                width: `${positionedEvent.width * 100}%`,
                zIndex: positionedEvent.zIndex,
              }}
            >
              <div className="size-full" style={{ height: positionedEvent.height || "auto" }}>
                {isClosed ? (
                  <EventItem
                    event={positionedEvent.event}
                    view="day"
                    showTime
                    className="line-through cursor-not-allowed h-full"
                  />
                ) : (
                  <DraggableEvent
                    event={positionedEvent.event}
                    view="day"
                    onClick={(e) => handleEventClick(positionedEvent.event, e)}
                    showTime
                    height={positionedEvent.height}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeVisible && (
            <div
              className="pointer-events-none absolute right-0 left-0 z-20"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="relative flex items-center">
                <div className="bg-primary dark:bg-border absolute -left-1 h-2 w-2 rounded-full"></div>
                <div className="bg-primary dark:bg-border h-[2px] w-full"></div>
              </div>
            </div>
          )}

          {/* Time grid */}
          {hours.map((hour) => {
            const hourValue = getHours(hour);
            return (
              <div
                key={hour.toString()}
                className="border-foreground/10 dark:border-border/10 relative h-[var(--week-cells-height)] border-b last:border-b-0"
              >
                {/* Quarter-hour intervals */}
                {[0, 1, 2, 3].map((quarter) => {
                  const quarterHourTime = hourValue + quarter * 0.25;
                  return (
                    <DroppableCell
                      key={`${hour.toString()}-${quarter}`}
                      id={`day-cell-${currentDate.toISOString()}-${quarterHourTime}`}
                      date={currentDate}
                      time={quarterHourTime}
                      className={cn(
                        "absolute h-[calc(var(--week-cells-height)/4)] w-full",
                        quarter === 0 && "top-0",
                        quarter === 1 &&
                          "top-[calc(var(--week-cells-height)/4)]",
                        quarter === 2 &&
                          "top-[calc(var(--week-cells-height)/4*2)]",
                        quarter === 3 &&
                          "top-[calc(var(--week-cells-height)/4*3)]",
                        isClosed && "cursor-not-allowed"
                      )}
                      onClick={isClosed ? undefined : () => {
                        const startTime = new Date(currentDate);
                        startTime.setHours(hourValue);
                        startTime.setMinutes(quarter * 15);
                        onEventCreate(startTime);
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
