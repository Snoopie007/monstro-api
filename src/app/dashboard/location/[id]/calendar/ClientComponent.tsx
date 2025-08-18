"use client";

import { use, useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
} from "date-fns";
import { toast } from "react-toastify";

import { useSessionCalendar } from "./providers/SessionCalendarProvider";
import { Calendar } from "@/components/ui/calendar";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarFilters } from "./components/CalendarFilters";
import { CalendarEvent as OldCalendarEvent } from "@/types";
import { tryCatch } from "@/libs/utils";
import { EnhancedEventDialog } from "./components/EnhancedEventDialog";

// Import new event calendar components
import {
  EventCalendar,
  CalendarDndProvider,
  type CalendarEvent,
  type CalendarView,
} from "@/components/event-calendar";
import LoaderOverlay from "@/components/ui/loader-overlay";

// Extend the CalendarEvent type to include original data
interface ExtendedCalendarEvent extends CalendarEvent {
  __originalData?: OldCalendarEvent["data"];
}

// Data adapter to convert old CalendarEvent to new CalendarEvent format
function convertToNewCalendarEvent(
  oldEvent: OldCalendarEvent
): ExtendedCalendarEvent {
  return {
    id: oldEvent.id,
    title: oldEvent.title,
    description: `Session: ${oldEvent.data.sessionId}${oldEvent.data.members.length > 0
      ? ` | ${oldEvent.data.members.length} member(s)`
      : ""
      }`,
    start: oldEvent.start,
    end: oldEvent.end,
    allDay: false,
    color: "sky" as const, // Default color for all events
    location: undefined,
    // Store original event data for dialog functionality
    __originalData: oldEvent.data,
  };
}

interface CalendarPageClientProps {
  params: Promise<{ id: string }>;
}

export default function CalendarPageClient({
  params,
}: CalendarPageClientProps) {
  const { id } = use(params);
  const { currentDate, setCurrentDate } = useSessionCalendar();
  const [view, setView] = useState<CalendarView>("month");

  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  // State for enhanced dialog
  const [isEnhancedDialogOpen, setIsEnhancedDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<ExtendedCalendarEvent | null>(null);

  // State to track cached date range - only update when navigation goes outside this range
  const [cachedDateRange, setCachedDateRange] = useState(() => ({
    startDate: startOfMonth(subMonths(currentDate, 3)),
    endDate: endOfMonth(addMonths(currentDate, 5)),
  }));

  // Track plan filter changes to reset cache
  const [lastPlanFilterHash, setLastPlanFilterHash] = useState(() =>
    JSON.stringify(selectedPlanIds)
  );

  // Smart caching: only update date range when currentDate goes outside cached range or filters change
  const { startDate, endDate } = useMemo(() => {
    const currentMonth = startOfMonth(currentDate);
    const cachedStart = cachedDateRange.startDate;
    const cachedEnd = cachedDateRange.endDate;
    const currentPlanFilterHash = JSON.stringify(selectedPlanIds);

    // Check if plan filters changed
    if (currentPlanFilterHash !== lastPlanFilterHash) {
      setLastPlanFilterHash(currentPlanFilterHash);
      const newRange = {
        startDate: startOfMonth(subMonths(currentDate, 3)),
        endDate: endOfMonth(addMonths(currentDate, 5)),
      };
      setCachedDateRange(newRange);
      return newRange;
    }

    // Check if current date is outside the cached range
    const isBeforeCachedRange = currentMonth < cachedStart;
    const isAfterCachedRange = currentMonth > cachedEnd;

    if (isBeforeCachedRange || isAfterCachedRange) {
      // Expand cache in the direction of navigation
      const newRange = {
        startDate: isBeforeCachedRange
          ? startOfMonth(subMonths(currentDate, 6)) // Expand backward
          : cachedStart,
        endDate: isAfterCachedRange
          ? endOfMonth(addMonths(currentDate, 6)) // Expand forward
          : cachedEnd,
      };

      setCachedDateRange(newRange);
      return newRange;
    }

    // Current date is within cached range, no API call needed
    return cachedDateRange;
  }, [currentDate, cachedDateRange, selectedPlanIds, lastPlanFilterHash]);

  // Use the existing hook to fetch events
  const {
    events: oldEvents,
    isLoading,
    mutate,
  } = useCalendarEvents({
    id,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    planIds: selectedPlanIds.length > 0 ? selectedPlanIds : undefined,
  });

  // Convert old events to new format
  const newEvents = useMemo<ExtendedCalendarEvent[]>(() => {
    if (!oldEvents) return [];
    return oldEvents.map(convertToNewCalendarEvent);
  }, [oldEvents]);

  // Handle calendar date selection - navigates to day view of selected date
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setView("day"); // Switch to day view when date is selected
  };

  // Handle removing a reservation (migrated from original implementation)
  const handleRemoveReservation = async (
    event: OldCalendarEvent,
    memberId: string
  ) => {
    try {
      const isRecurring = event.data.isRecurring;
      let url: string;

      if (isRecurring) {
        if (!event.data.recurringId) {
          throw new Error("Missing recurringId for recurring reservation");
        }
        url = `/api/protected/loc/${id}/members/${memberId}/reservations/${event.data.recurringId
          }/recurring?date=${format(event.start, "yyyy-MM-dd")}`;
      } else {
        if (!event.data.reservationId) {
          throw new Error("Missing reservationId for regular reservation");
        }
        url = `/api/protected/loc/${id}/members/${memberId}/reservations/${event.data.reservationId}`;
      }

      const { result, error } = await tryCatch(
        fetch(url, { method: "DELETE" })
      );

      if (error || !result || !result.ok) {
        throw error || new Error("Failed to remove reservation");
      }

      // Refresh events after successful removal
      mutate();
    } catch (error) {
      console.error("Error removing reservation:", error);
      throw error; // Re-throw for the dialog to handle
    }
  };

  // Handle event selection to open enhanced dialog
  const handleEventSelect = (event: ExtendedCalendarEvent) => {
    setSelectedEvent(event);
    setIsEnhancedDialogOpen(true);
  };

  // Event handlers for the new calendar
  const handleEventAdd = async (event: CalendarEvent) => {
    console.log("Program created from calendar:", event);
    toast.success("Program created successfully");
    // The actual API call is handled in the dialog component
    mutate(); // Refresh events after program creation
  };

  const handleEventUpdate = async (event: CalendarEvent) => {
    // Note: Event updates are handled by the EnhancedEventDialog for existing sessions
    mutate(); // Refresh events after update
  };

  const handleEventDelete = async (eventId: string) => {
    // Note: Event deletion is handled by the EnhancedEventDialog for existing sessions
    mutate(); // Refresh events after deletion
  };

  return (
    <div className="flex flex-row h-full ">
      <CalendarDndProvider onEventUpdate={handleEventUpdate}>
        <div className="relative flex-1 h-full p-2">
          {/* Loader Overlay on the container */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderOverlay isLoading={isLoading} />
            </div>
          )}
          <EventCalendar
            events={newEvents}
            currentDate={currentDate}
            view={view}
            onDateChange={setCurrentDate}
            onViewChange={setView}
            onEventAdd={handleEventAdd}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            onEventClick={handleEventSelect}
            lid={id}
          />
        </div>
      </CalendarDndProvider>

      <div className="flex-initial w-[300px] flex flex-col pl-0 pr-2 pt-2 pb-1 space-y-2">
        {/* Small calendar date picker for navigation to day view */}
        <div className="rounded-lg border border-foreground/10 bg-background flex py-4 flex-row justify-center items-center">
          <Calendar
            mode="single"
            fromDate={new Date()}
            selected={currentDate}
            onSelect={(date) => {
              if (date) {
                handleDateSelect(date);
              }
            }}
            className="p-0 w-[250px]"
          />
        </div>
        <CalendarFilters
          locationId={id}
          selectedPlanIds={selectedPlanIds}
          onFilterChange={setSelectedPlanIds}
        />
      </div>
      <EnhancedEventDialog
        event={selectedEvent}
        isOpen={isEnhancedDialogOpen}
        onClose={() => {
          setIsEnhancedDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleEventUpdate}
        onDelete={handleEventDelete}
        lid={id}
        onRemoveReservation={handleRemoveReservation}
        onRefreshEvents={() => mutate()}
        onMemberUpdate={() => mutate()}
      />
    </div>
  );
}
