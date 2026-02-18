"use client";

import React from "react";

import type { CalendarEvent, CalendarView, ClosedDate } from "@/types/calendar";
import { AgendaView, DayView, MonthView, WeekView } from "./";
import { cn } from "@/libs/utils";

interface CalendarViewRendererProps {
	view: CalendarView;
	currentDate: Date;
	events: CalendarEvent[];
	closedDates?: ClosedDate[];
	onEventSelect: (event: CalendarEvent) => void;
	onEventCreate: (startTime: Date) => void;
}

export const CalendarViewRenderer = React.memo(function CalendarViewRenderer({
	view,
	currentDate,
	events,
	closedDates = [],
	onEventSelect,
	onEventCreate,
}: CalendarViewRendererProps) {
	return (
		<div
			className={cn(
				"flex flex-1 flex-col bg-foreground/5 rounded-lg overflow-auto",
				view === "month" ? "h-full min-h-0" : ""
			)}
		>
			{view === "month" && (
				<MonthView
					currentDate={currentDate}
					events={events}
					closedDates={closedDates}
					onEventSelect={onEventSelect}
					onEventCreate={onEventCreate}
				/>
			)}
		{view === "week" && (
			<WeekView
				currentDate={currentDate}
				events={events}
				closedDates={closedDates}
				onEventSelect={onEventSelect}
				onEventCreate={onEventCreate}
			/>
		)}
		{view === "day" && (
			<DayView
				currentDate={currentDate}
				events={events}
				closedDates={closedDates}
				onEventSelect={onEventSelect}
				onEventCreate={onEventCreate}
			/>
		)}
		{view === "agenda" && (
			<AgendaView
				currentDate={currentDate}
				events={events}
				closedDates={closedDates}
				onEventSelect={onEventSelect}
			/>
		)}
		</div>
	);
});

CalendarViewRenderer.displayName = "CalendarViewRenderer";
