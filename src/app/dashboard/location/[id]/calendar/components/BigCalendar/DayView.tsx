"use client";
import { cn } from "@/libs/utils";
import { isSameDay, format, isToday } from "date-fns";
import React, { useMemo } from "react";
import { CalendarEvent } from "@/types";
import { ScrollArea } from "@/components/ui";
import { useSessionCalendar } from "../../providers/SessionCalendarProvider";
import { CurrentTimeLine } from "./CurrentTimeLine";

interface DayViewProps {
  events?: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function DayView({
  events = [],
  currentDate,
  onEventClick,
}: DayViewProps) {
  const { setCurrentEvent } = useSessionCalendar();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Process events to include positioning data with overlap detection
  const processedEvents = useMemo(() => {
    const dayEvents = events
      .filter((event) => isSameDay(new Date(event.start), currentDate))
      .map((event) => {
        const startDate = new Date(event.start);
        const hour = startDate.getHours();
        const minute = startDate.getMinutes();
        const heightInPixels = Math.max(event.duration, 30);
        const topPosition = hour * 60 + minute;
        const endPosition = topPosition + heightInPixels;

        return {
          ...event,
          heightInPixels,
          topPosition,
          endPosition,
        };
      })
      .sort((a, b) => a.topPosition - b.topPosition);

    if (dayEvents.length === 0) return [];

    // Type for events with positioning data
    type EventWithPosition = (typeof dayEvents)[0] & {
      columnIndex: number;
      totalColumns: number;
    };

    // Better overlap detection and column assignment
    const result: EventWithPosition[] = [];

    for (let i = 0; i < dayEvents.length; i++) {
      const currentEvent = dayEvents[i];

      // Find all events that overlap with the current event
      const overlappingEvents = dayEvents.filter((otherEvent, j) => {
        if (i === j) return false;
        // Check if events overlap
        return (
          currentEvent.topPosition < otherEvent.endPosition &&
          currentEvent.endPosition > otherEvent.topPosition
        );
      });

      // Find the first available column
      const usedColumns = new Set<number>();

      // Check which columns are already used by overlapping events that we've already processed
      overlappingEvents.forEach((overlappingEvent) => {
        const processedEvent = result.find((e) => e.id === overlappingEvent.id);
        if (processedEvent) {
          usedColumns.add(processedEvent.columnIndex);
        }
      });

      // Find the first available column starting from 0
      let columnIndex = 0;
      while (usedColumns.has(columnIndex)) {
        columnIndex++;
      }

      // Calculate total columns needed for this overlap group
      const totalColumns = Math.max(
        overlappingEvents.length + 1,
        columnIndex + 1
      );

      result.push({
        ...currentEvent,
        columnIndex,
        totalColumns,
      });
    }

    // Update totalColumns for all events in each overlap group to be consistent
    const finalResult = result.map((event) => {
      const overlappingEvents = result.filter((otherEvent) => {
        if (event.id === otherEvent.id) return false;
        return (
          event.topPosition < otherEvent.endPosition &&
          event.endPosition > otherEvent.topPosition
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

    return finalResult;
  }, [events, currentDate]);

  const isCurrentDay = isToday(currentDate);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-105px)]">
          <div className="relative">
            {isCurrentDay && <CurrentTimeLine />}

            {hours.map((hour) => (
              <div
                key={hour}
                className="flex border-b border-foreground/10 min-h-[60px] max-h-[60px] relative "
              >
                <div className="w-[60px] flex-shrink-0 p-2 text-xs text-foreground/60 border-r border-foreground/10">
                  {format(new Date().setHours(hour, 0), "h a")}
                </div>
                <div className="flex-grow relative h-full"></div>
              </div>
            ))}

            {/* Overlay events on top of the time grid */}
            {processedEvents.map((event) => (
              <DayEventItem
                key={event.id}
                event={event}
                onSelect={onEventClick || setCurrentEvent}
                position={{
                  top: event.topPosition,
                  height: event.heightInPixels,
                  columnIndex: event.columnIndex,
                  totalColumns: event.totalColumns,
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
    columnIndex: number;
    totalColumns: number;
  };
}

function DayEventItem({ event, onSelect, position }: DayEventItemProps) {
  const availableWidth = 300; // Max width for events area
  const eventWidth = availableWidth / position.totalColumns;
  const leftOffset = 60 + position.columnIndex * eventWidth; // 60px for time column + column offset

  return (
    <div
      className={"absolute"}
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`,
        left: `${leftOffset}px`,
        width: `${eventWidth - 4}px`, // Subtract 4px for some spacing between events
      }}
      onClick={() => onSelect(event)}
    >
      <div
        className={cn(
          "flex flex-row w-full text-foreground ",
          "border-l-3 border-indigo-600 p-2 items-center rounded-sm ",
          "cursor-pointer bg-background hover:bg-foreground/10 hover:text-white group transition-colors"
        )}
      >
        <span className="font-medium text-sm truncate">{event.title}</span>
        {event.data.members.length > 0 && (
          <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded flex-shrink-0">
            {event.data.members.length}
          </span>
        )}
      </div>
    </div>
  );
}
