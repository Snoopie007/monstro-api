"use client";

// Component exports
export { AgendaView } from "./AgendaView";
export { DayView } from "./DayView";
export { DraggableEvent } from "./DraggableEvent";
export { DroppableCell } from "./DroppableCell";
export { EventDialog } from "./EventDialog";
export { EventItem } from "./EventItem";
export { EventsPopup } from "./EventsPopup";
export { EventCalendar, type EventCalendarProps } from "./EventCalendar";
export { MonthView } from "./MonthView";
export { WeekView } from "./WeekView";
export { CalendarDndProvider, useCalendarDnd } from "./CalendarDndContext";

// Constants and utility exports
export * from "./constants";
export * from "./utils";

// Hook exports
export * from "./hooks/useCurrentTimeIndicator";
export * from "./hooks/useEventVisibility";

// Type exports
export type { CalendarEvent, CalendarView, EventColor } from "./types";
