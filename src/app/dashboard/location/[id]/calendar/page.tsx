"use client";
import { use, useEffect, useState } from "react";
import { BigCalendar } from "./components/BigCalendar";
import { useSessionCalendar } from "./providers/SessionCalendarProvider";
import { Calendar } from "@/components/ui/calendar";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { ReservationModal } from "./components/ReservationModal";
import { CalendarFilters } from "./components/CalendarFilters";
import { startOfMonth, endOfMonth, format } from "date-fns";

import { CalendarEvent, CalendarView } from "@/types";
import { tryCatch } from "@/libs/utils";

export default function CalendarPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  console.log(id);
  const {
    currentDate,
    setCurrentDate,
    currentMonth,
    setCurrentMonth,
    setCurrentEvent,
    currentEvent,
  } = useSessionCalendar();

  const [view, setView] = useState<CalendarView>("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  // Calculate date range for the current view
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  // Use the new hook with startDate and endDate
  const { events, isLoading, mutate } = useCalendarEvents({
    id,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });

  // Handle reservation click
  const handleReservationClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Handle calendar date selection
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setView("day"); // Switch to day view when date is selected
  };

  // Handle removing a reservation
  const handleRemoveReservation = async (
    event: CalendarEvent,
    memberId: string
  ) => {
    try {
      const isRecurring = event.data.isRecurring;
      let url: string;

      if (isRecurring) {
        if (!event.data.recurringId) {
          throw new Error("Missing recurringId for recurring reservation");
        }
        url = `/api/protected/loc/${id}/members/${memberId}/reservations/${
          event.data.recurringId
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
      // You might want to add toast notification here
    }
  };

  return (
    <div className="flex flex-row h-full bg-foreground/5">
      <div className="flex-1 h-full">
        <BigCalendar
          events={events || []}
          view={view}
          onViewChange={setView}
          onEventClick={handleReservationClick}
        />
      </div>
      <div className="flex-initial w-[300px] flex flex-col pl-0 pr-2 pt-2 pb-1 space-y-2">
        <div className="rounded-lg border border-foreground/10 bg-background flex py-4 flex-row justify-center  items-center ">
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

      <ReservationModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
        lid={id}
        onRemoveReservation={handleRemoveReservation}
        onRefreshEvents={() => mutate()}
      />
    </div>
  );
}
