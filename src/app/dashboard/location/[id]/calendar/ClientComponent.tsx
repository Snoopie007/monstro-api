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

import { useSessionCalendar } from "./providers";
import { Calendar } from "@/components/ui/calendar";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarFilters } from "./components/";
import { tryCatch } from "@/libs/utils";
import { SessionManagementDialog } from "./components/EnhancedEventDialog";

import {
  EventCalendar,
  CalendarDndProvider
} from "@/components/event-calendar";
import { CalendarEvent, CalendarView } from "@/types";
import { Loader2 } from "lucide-react";

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

  // State for session management dialog
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

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
    events,
    isLoading,
    mutate,
  } = useCalendarEvents({
    id,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    planIds: selectedPlanIds.length > 0 ? selectedPlanIds : undefined,
  });

  // Handle calendar date selection - navigates to day view of selected date
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setView("day"); // Switch to day view when date is selected
  };

  // Handle removing a reservation (migrated from original implementation)
  const handleRemoveReservation = async (
    event: CalendarEvent,
    memberId: string
  ) => {
    try {
      if (!event.data) {
        throw new Error("Event data is missing");
      }

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

  // Handle event selection to open session management dialog
  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsSessionDialogOpen(true);
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
        <div className="relative flex-1 h-full pr-2 pb-2">
          {/* Loader Overlay on the container */}
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-foreground/80">Loading events...</span>
            </div>
          ) : (
            <EventCalendar
              events={events}
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
              onEventUpdate={handleEventUpdate}
              onEventClick={handleEventSelect}
            />
          )}
        </div>
      </CalendarDndProvider>

      <div className="flex-initial w-[300px] flex flex-col space-y-2">
        {/* Small calendar date picker for navigation to day view */}
        <div className="rounded-lg border border-foreground/10  flex py-4 flex-row justify-center items-center">
          <Calendar
            mode="single"
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
      <SessionManagementDialog
        event={selectedEvent}
        isOpen={isSessionDialogOpen}
        onClose={() => {
          setIsSessionDialogOpen(false);
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
