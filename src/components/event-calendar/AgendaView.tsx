"use client";

import { useMemo } from "react";
import { RiCalendarEventLine } from "@remixicon/react";
import { addDays, format, isToday } from "date-fns";
import { CalendarX, Wrench } from "lucide-react";

import {
	AgendaDaysToShow,
	EventItem,
} from "@/components/event-calendar";
import type { CalendarEvent, ClosedDate } from "@/types";
import { getAgendaEventsForDay } from "@/libs/calendar";
import { cn } from "@/libs/utils";

interface AgendaViewProps {
	currentDate: Date;
	events: CalendarEvent[];
	closedDates?: ClosedDate[];
	onEventSelect: (event: CalendarEvent) => void;
}

export function AgendaView({
	currentDate,
	events,
	closedDates = [],
	onEventSelect,
}: AgendaViewProps) {
	// Show events for the next days based on constant
	const days = useMemo(() => {
		console.log("Agenda view updating with date:", currentDate.toISOString());
		return Array.from({ length: AgendaDaysToShow }, (_, i) =>
			addDays(new Date(currentDate), i)
		);
	}, [currentDate]);

	const closedDatesByDay = useMemo(() => {
		const map = new Map<string, ClosedDate>();
		closedDates.forEach(closure => {
			const dateKey = closure.date.slice(0, 10);
			map.set(dateKey, closure);
		});
		return map;
	}, [closedDates]);

	const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
		e.stopPropagation();
		console.log("Agenda view event clicked:", event);
		onEventSelect(event);
	};

	// Check if there are any days with events or closures
	const hasContent = days.some(
		(day) => {
			const dayKey = format(day, 'yyyy-MM-dd');
			return getAgendaEventsForDay(events, day).length > 0 || closedDatesByDay.has(dayKey);
		}
	);

	return (
		<div className="px-4">
			{!hasContent ? (
				<div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
					<RiCalendarEventLine
						size={32}
						className="text-muted-foreground/50 mb-2"
					/>
					<h3 className="text-lg font-medium">No events found</h3>
					<p className="text-muted-foreground">
						There are no events scheduled for this time period.
					</p>
				</div>
			) : (
				days.map((day) => {
					const dayKey = format(day, 'yyyy-MM-dd');
					const dayEvents = getAgendaEventsForDay(events, day);
					const closedDate = closedDatesByDay.get(dayKey);
					const isClosed = !!closedDate;

					if (dayEvents.length === 0 && !isClosed) return null;

					return (
						<div
							key={day.toString()}
							className="border-border/10 relative my-12 border-t"
						>
							<span className={cn(
								"bg-background absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs",
								isClosed && "gap-2"
							)}
								data-today={isToday(day) || undefined}
							>
								{format(day, "d MMM, EEEE")}
								{isClosed && (
									<span className={cn(
										"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
										closedDate.type === 'holiday' 
											? "bg-amber-500/10 text-amber-700 dark:text-amber-400" 
											: "bg-blue-500/10 text-blue-700 dark:text-blue-400"
									)}>
										{closedDate.type === 'holiday' ? (
											<CalendarX className="size-3" />
										) : (
											<Wrench className="size-3" />
										)}
										Closed
									</span>
								)}
							</span>
							<div className="mt-6 space-y-2">
								{isClosed && (
									<div className={cn(
										"rounded-lg px-3 py-2 text-sm",
										closedDate.type === 'holiday' 
											? "bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300" 
											: "bg-blue-500/5 border border-blue-500/20 text-blue-700 dark:text-blue-300"
									)}>
										<span className="font-medium">{closedDate.reason}</span>
										{dayEvents.length > 0 && (
											<span className="text-muted-foreground ml-2">
												• {dayEvents.length} session{dayEvents.length > 1 ? 's' : ''} cancelled
											</span>
										)}
									</div>
								)}
								{dayEvents.map((event: CalendarEvent) => (
									<div
										key={event.id}
										className={cn(isClosed && "opacity-40 pointer-events-none")}
									>
										<EventItem
											event={event}
											view="agenda"
											onClick={isClosed ? undefined : (e: React.MouseEvent) =>
												handleEventClick(event, e)
											}
											className={cn(isClosed && "line-through cursor-not-allowed")}
										/>
									</div>
								))}
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}
