"use client";

import {
	addDays,
	endOfWeek,
	format,
	isSameMonth,
	startOfWeek,
} from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
	AgendaDaysToShow,
	CalendarDndProvider,
	EventGap,
	EventHeight,
	WeekCellsHeight,
} from "./";
import type { CalendarEvent, CalendarView, ClosedDate } from "@/types/calendar";
import { cn } from "@/libs/utils";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarViewRenderer } from "./CalendarViewRenderer";
import {
	useCalendarKeyboardShortcuts,
} from "@/hooks";

export interface EventCalendarProps {
	events?: CalendarEvent[];
	closedDates?: ClosedDate[];
	onEventUpdate?: (event: CalendarEvent) => void;
	onEventClick?: (event: CalendarEvent) => void;
	className?: string;
	initialView?: CalendarView;

	// External state props
	currentDate?: Date;
	view?: CalendarView;
	onDateChange?: (date: Date) => void;
	onViewChange?: (view: CalendarView) => void;
}

export function EventCalendar({
	events = [],
	closedDates = [],
	onEventUpdate,
	onEventClick,
	className,
	initialView = "month",

	// External state props
	currentDate: externalCurrentDate,
	view: externalView,
	onDateChange,
	onViewChange,
}: EventCalendarProps) {
	// Use external state if provided, otherwise use internal state
	const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
	const [internalView, setInternalView] = useState<CalendarView>(initialView);

	// Determine which state to use
	const currentDate = externalCurrentDate ?? internalCurrentDate;
	const view = externalView ?? internalView;

	// Handle view changes
	const handleViewChange = useCallback(
		(newView: CalendarView) => {
			if (onViewChange) {
				onViewChange(newView);
			} else {
				setInternalView(newView);
			}
		},
		[onViewChange]
	);

	// Use keyboard shortcuts hook (no dialog needed anymore)
	useCalendarKeyboardShortcuts({
		isDialogOpen: false, // Never blocked since no dialog
		onViewChange: handleViewChange,
	});

	// Date navigation handlers
	const handlePrevious = useCallback(() => {
		let newDate: Date;

		if (view === "month") {
			newDate = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() - 1,
				1
			);
		} else if (view === "week") {
			newDate = new Date(currentDate);
			newDate.setDate(currentDate.getDate() - 7);
		} else if (view === "day") {
			newDate = addDays(currentDate, -1);
		} else if (view === "agenda") {
			newDate = addDays(currentDate, -AgendaDaysToShow);
		} else {
			newDate = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() - 1,
				1
			);
		}

		if (onDateChange) {
			onDateChange(newDate);
		} else {
			setInternalCurrentDate(newDate);
		}
	}, [currentDate, view, onDateChange]);

	const handleNext = useCallback(() => {
		let newDate: Date;

		if (view === "month") {
			newDate = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				1
			);
		} else if (view === "week") {
			newDate = new Date(currentDate);
			newDate.setDate(currentDate.getDate() + 7);
		} else if (view === "day") {
			newDate = addDays(currentDate, 1);
		} else if (view === "agenda") {
			newDate = addDays(currentDate, AgendaDaysToShow);
		} else {
			newDate = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				1
			);
		}

		if (onDateChange) {
			onDateChange(newDate);
		} else {
			setInternalCurrentDate(newDate);
		}
	}, [currentDate, view, onDateChange]);

	const handleToday = useCallback(() => {
		const today = new Date();

		if (onDateChange) {
			onDateChange(today);
		} else {
			setInternalCurrentDate(today);
		}
	}, [onDateChange]);

	// Event handlers - simplified, no creation
	const handleEventSelect = useCallback(
		(event: CalendarEvent) => {
			if (onEventClick) {
				onEventClick(event);
			}
		},
		[onEventClick]
	);

	const handleEventCreate = useCallback(
		(startTime: Date) => {
			// Event creation removed - just log for now
			console.log("Event creation disabled - clicked at:", startTime);
		},
		[]
	);

	const handleEventUpdate = useCallback(
		(updatedEvent: CalendarEvent) => {
			onEventUpdate?.(updatedEvent);

			toast.success(
				`Event "${updatedEvent.title}" moved to ${format(
					new Date(updatedEvent.start),
					"MMM d, yyyy"
				)}`
			);
		},
		[onEventUpdate]
	);

	// Compute view title
	const viewTitle = useMemo(() => {
		if (view === "month") {
			return format(currentDate, "MMMM yyyy");
		} else if (view === "week") {
			const start = startOfWeek(currentDate, { weekStartsOn: 0 });
			const end = endOfWeek(currentDate, { weekStartsOn: 0 });
			if (isSameMonth(start, end)) {
				return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
			} else {
				return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
			}
		} else if (view === "day") {
			return (
				<>
					<span className="min-[480px]:hidden" aria-hidden="true">
						{format(currentDate, "MMM d, yyyy")}
					</span>
					<span className="max-[479px]:hidden min-md:hidden" aria-hidden="true">
						{format(currentDate, "MMMM d, yyyy")}
					</span>
					<span className="max-md:hidden">
						{format(currentDate, "EEE MMMM d, yyyy")}
					</span>
				</>
			);
		} else if (view === "agenda") {
			const start = currentDate;
			const end = addDays(currentDate, AgendaDaysToShow - 1);

			if (isSameMonth(start, end)) {
				return format(start, "MMMM yyyy");
			} else {
				return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
			}
		} else {
			return format(currentDate, "MMMM yyyy");
		}
	}, [currentDate, view]);

	return (
		<div
			className={cn(
				"flex flex-col rounded-lg max-h-full",
				view === "month" ? "h-full" : ""
			)}
			style={
				{
					"--event-height": `${EventHeight}px`,
					"--event-gap": `${EventGap}px`,
					"--week-cells-height": `${WeekCellsHeight}px`,
				} as React.CSSProperties
			}
		>
			<CalendarDndProvider onEventUpdate={handleEventUpdate}>
				<CalendarToolbar
					viewTitle={viewTitle}
					view={view}
					onPrevious={handlePrevious}
					onNext={handleNext}
					onToday={handleToday}
					onViewChange={handleViewChange}
					className={className}
				/>

				<CalendarViewRenderer
					view={view}
					currentDate={currentDate}
					events={events}
					closedDates={closedDates}
					onEventSelect={handleEventSelect}
					onEventCreate={handleEventCreate}
				/>
			</CalendarDndProvider>
		</div>
	);
}
