"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	addDays,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isPast,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
} from "date-fns";


import {
	DraggableEvent,
	DroppableCell,
	EventGap,
	EventHeight,
	EventItem,
} from "../event-calendar";
import type { CalendarEvent, ClosedDate } from "@/types";
import { DefaultStartHour } from "@/components/event-calendar/constants";
import { getAllEventsForDay, getEventsForDay, getSpanningEventsForDay, sortEvents } from "@/libs/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/ToolTip";
import { useEventVisibility } from "@/hooks";
import { cn } from "@/libs/utils";
import { CalendarX, Wrench } from "lucide-react";

interface MonthViewProps {
	currentDate: Date;
	events: CalendarEvent[];
	closedDates?: ClosedDate[];
	onEventSelect: (event: CalendarEvent) => void;
	onEventCreate: (startTime: Date) => void;
}

// Pre-computed event data for a single day
interface DayEventData {
	dayEvents: CalendarEvent[];
	spanningEvents: CalendarEvent[];
	allDayEvents: CalendarEvent[];
	allEvents: CalendarEvent[];
}

const DayCellStyle = cn(
	"group border-foreground/5 data-outside-cell:bg-muted/50",
	"data-outside-cell:text-muted/50 border-r border-b last:border-r-0 flex flex-col h-full"
)

export function MonthView({
	currentDate,
	events,
	closedDates = [],
	onEventSelect,
	onEventCreate,
}: MonthViewProps) {
	const days = useMemo(() => {
		const monthStart = startOfMonth(currentDate);
		const monthEnd = endOfMonth(monthStart);
		const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
		const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

		return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
	}, [currentDate]);

	const weekdays = useMemo(() => {
		return Array.from({ length: 7 }).map((_, i) => {
			const date = addDays(startOfWeek(new Date()), i);
			return format(date, "EEE");
		});
	}, []);

	const weeks = useMemo(() => {
		const result = [];
		let week = [];

		for (let i = 0; i < days.length; i++) {
			week.push(days[i]);
			if (week.length === 7 || i === days.length - 1) {
				result.push(week);
				week = [];
			}
		}

		return result;
	}, [days]);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, DayEventData>();

		days.forEach(day => {
			const key = format(day, 'yyyy-MM-dd');
			const dayEvents = getEventsForDay(events, day);
			const spanningEvents = getSpanningEventsForDay(events, day);
			const allDayEvents = [...spanningEvents, ...dayEvents];
			const allEvents = getAllEventsForDay(events, day);

			map.set(key, {
				dayEvents,
				spanningEvents,
				allDayEvents,
				allEvents,
			});
		});

		return map;
	}, [events, days]);

	const closedDatesByDay = useMemo(() => {
		const map = new Map<string, ClosedDate>();
		closedDates.forEach(closure => {
			const dateKey = closure.date.slice(0, 10);
			map.set(dateKey, closure);
		});
		return map;
	}, [closedDates]);

	const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();

		onEventSelect(event);
	}, [onEventSelect]);

	const [isMounted, setIsMounted] = useState(false);
	const { contentRef, getVisibleEventCount } = useEventVisibility({
		eventHeight: EventHeight,
		eventGap: EventGap,
	});

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const numberOfWeeks = weeks.length;

	return (
		<div data-slot="month-view" className="contents">
			<div className="border-foreground/5 grid grid-cols-7 border-b">
				{weekdays.map((day) => (
					<div key={day} className="text-muted-foreground/70 py-2 text-center ">
						{day}
					</div>
				))}
			</div>
			<div className="grid flex-1 h-full" style={{
				gridTemplateRows: `repeat(${numberOfWeeks}, 1fr)`,
			}}>
				{weeks.map((week, weekIndex) => (
					<div key={`week-${weekIndex}`}
						className="grid grid-cols-7 [&:last-child>*]:border-b-0"
					>
						{week.map((day, dayIndex) => {
							if (!day) return null;

							const dayKey = format(day, 'yyyy-MM-dd');
							const eventData = eventsByDay.get(dayKey);
							const allDayEvents = eventData?.allDayEvents || [];
							const allEvents = eventData?.allEvents || [];
							const closedDate = closedDatesByDay.get(dayKey);

							const isReferenceCell = weekIndex === 0 && dayIndex === 0;

							return (
								<DayCell
									key={day.toString()}
									day={day}
									allDayEvents={allDayEvents}
									allEvents={allEvents}
									closedDate={closedDate}
									isCurrentMonth={isSameMonth(day, currentDate)}
									isReferenceCell={isReferenceCell}
									isMounted={isMounted}
									getVisibleEventCount={getVisibleEventCount}
									contentRef={contentRef}
									onEventClick={handleEventClick}
									onEventCreate={onEventCreate}
									onEventSelect={onEventSelect}
								/>
							);
						})}
					</div>
				))
				}
			</div >
		</div >
	);
}

interface DayCellProps {
	day: Date;
	allDayEvents: CalendarEvent[];
	allEvents: CalendarEvent[];
	closedDate?: ClosedDate;
	isCurrentMonth: boolean;
	isReferenceCell: boolean;
	isMounted: boolean;
	getVisibleEventCount: (totalEvents: number) => number;
	contentRef: React.RefObject<HTMLDivElement>;
	onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
	onEventCreate: (startTime: Date) => void;
	onEventSelect: (event: CalendarEvent) => void;
}

const ClosedDayCellStyle = cn(
	"group border-foreground/5 data-outside-cell:bg-muted/50",
	"data-outside-cell:text-muted/50 border-r border-b last:border-r-0 flex flex-col h-full",
	"bg-gray-100 dark:bg-gray-800/50 relative",
	"bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.03)_4px,rgba(0,0,0,0.03)_8px)]",
	"dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)]"
);

const DayCell = React.memo(function DayCell({
	day,
	allDayEvents,
	allEvents,
	closedDate,
	isCurrentMonth,
	isReferenceCell,
	isMounted,
	getVisibleEventCount,
	contentRef,
	onEventClick,
	onEventCreate,
	onEventSelect,
}: DayCellProps) {
	const cellId = `month-cell-${day.toISOString()}`;
	const isClosed = !!closedDate;

	const visibleCount = isMounted
		? getVisibleEventCount(allDayEvents.length)
		: undefined;
	const hasMore =
		visibleCount !== undefined &&
		allDayEvents.length > visibleCount;
	const remainingCount = hasMore
		? allDayEvents.length - visibleCount
		: 0;

	if (isClosed) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={ClosedDayCellStyle}
						data-today={isToday(day) || undefined}
						data-outside-cell={!isCurrentMonth || undefined}
					>
						<div className="flex flex-col h-full p-1 cursor-not-allowed">
							<div className={cn(
								"group-data-today:text-indigo-500 group-data-today:font-medium",
								"inline-flex w-6 h-auto items-center justify-center rounded-lg text-sm text-muted-foreground"
							)}>
								{format(day, "d")}
							</div>
							<div
								ref={isReferenceCell ? contentRef : null}
								className={cn(
									"flex-1 flex flex-col min-h-[calc((var(--event-height)+var(--event-gap))*2)]",
									"sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]",
									"opacity-40 pointer-events-none"
								)}
							>
								{sortEvents(allDayEvents).map(
									(event: CalendarEvent, index: number) => {
										const eventStart = new Date(event.start);
										const eventEnd = new Date(event.end);
										const isFirstDay = isSameDay(day, eventStart);
										const isLastDay = isSameDay(day, eventEnd);

										const isHidden = isMounted && visibleCount && index >= visibleCount;

										if (!visibleCount) return null;

										return (
											<div key={`closed-${event.id}-${day.toISOString().slice(0, 10)}`}
												className="aria-hidden:hidden"
												aria-hidden={isHidden ? "true" : undefined}
											>
												<EventItem
													event={event}
													view="month"
													isFirstDay={isFirstDay}
													isLastDay={isLastDay}
													className="line-through"
												>
													{isFirstDay && (
														<div className="truncate">
															{!event.allDay && (
																<span>
																	{format(new Date(event.start), "h:mm")}{" "}
																</span>
															)}
															{event.title}
														</div>
													)}
													{!isFirstDay && (
														<div className="invisible" aria-hidden={true}>
															{event.title}
														</div>
													)}
												</EventItem>
											</div>
										);
									}
								)}
								{hasMore && (
									<div className="text-muted-foreground text-xs pt-1.5">
										+ {remainingCount} cancelled
									</div>
								)}
							</div>
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="space-y-1">
						<div className="font-medium flex items-center gap-1.5">
							{closedDate.type === 'holiday' ? (
								<CalendarX className="size-3" />
							) : (
								<Wrench className="size-3" />
							)}
							Closed: {closedDate.reason}
						</div>
						{allEvents.length > 0 && (
							<div className="text-xs opacity-80">
								{allEvents.length} session{allEvents.length > 1 ? 's' : ''} cancelled
							</div>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<div
			className={DayCellStyle}
			data-today={isToday(day) || undefined}
			data-outside-cell={!isCurrentMonth || undefined}
		>
			<DroppableCell
				id={cellId}
				date={day}
				onClick={() => {
					const startTime = new Date(day);
					startTime.setHours(DefaultStartHour, 0, 0);
					onEventCreate(startTime);
				}}
				className="flex flex-col h-full"
			>
				<div className={cn(
					"group-data-today:text-indigo-500 group-data-today:font-medium",
					"inline-flex w-6 h-auto items-center justify-center rounded-lg text-sm"
				)}>
					{format(day, "d")}
				</div>
				<div
					ref={isReferenceCell ? contentRef : null}
					className={cn(
						"flex-1 flex flex-col min-h-[calc((var(--event-height)+var(--event-gap))*2)]",
						"sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]"
					)}
				>
					{sortEvents(allDayEvents).map(
						(event: CalendarEvent, index: number) => {
							const eventStart = new Date(event.start);
							const eventEnd = new Date(event.end);
							const isFirstDay = isSameDay(day, eventStart);
							const isLastDay = isSameDay(day, eventEnd);

							const isHidden = isMounted && visibleCount && index >= visibleCount;

							if (!visibleCount) return null;

							if (!isFirstDay) {
								return (
									<div key={`spanning-${event.id}-${day.toISOString().slice(0, 10)}`}
										className="aria-hidden:hidden"
										aria-hidden={isHidden ? "true" : undefined}
									>
										<EventItem onClick={(e: React.MouseEvent) => {
											onEventClick(event, e);
										}}
											event={event}
											view="month"
											isFirstDay={isFirstDay}
											isLastDay={isLastDay}
										>
											<div className="invisible" aria-hidden={true}>
												{!event.allDay && (
													<span>
														{format(new Date(event.start), "h:mm")}{" "}
													</span>
												)}
												{event.title}
											</div>
										</EventItem>
									</div>
								);
							}

							return (
								<div key={event.id} className="aria-hidden:hidden"
									aria-hidden={isHidden ? "true" : undefined}
								>
									<DraggableEvent
										event={event}
										view="month"
										onClick={(e: React.MouseEvent) => {
											onEventClick(event, e);
										}}
										isFirstDay={isFirstDay}
										isLastDay={isLastDay}
									/>
								</div>
							);
						}
					)}

					{hasMore && (
						<HasMoreEvents
							remainingCount={remainingCount}
							day={day}
							allEvents={allEvents}
							onEventClick={onEventSelect}
						/>
					)}
				</div>
			</DroppableCell>
		</div>
	);
})

interface HasMoreEventsProps {
	remainingCount: number;
	day: Date;
	allEvents: CalendarEvent[];
	onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

function HasMoreEvents({ remainingCount, day, allEvents, onEventClick }: HasMoreEventsProps) {
	return (
		<Popover modal>
			<PopoverTrigger onClick={(e: React.MouseEvent) => {
				e.stopPropagation();
			}} >
				<div className="text-muted-foreground cursor-pointer hover:text-foreground flex flex-row items-start justify-start text-xs pt-1.5">
					+ {remainingCount} more

				</div>
			</PopoverTrigger>
			<PopoverContent align="center" className="max-w-52 p-3 border-foreground/5"
				style={{
					"--event-height": `${EventHeight}px`,
				} as React.CSSProperties}
			>
				<div className="space-y-2">
					<div className="text-sm font-medium">
						{format(day, "EEE d")}
					</div>
					<div className="space-y-1">
						{sortEvents(allEvents).map(
							(event: CalendarEvent) => {
								const eventStart = new Date(event.start);
								const eventEnd = new Date(event.end);
								const isFirstDay = isSameDay(day, eventStart);
								const isLastDay = isSameDay(day, eventEnd);
								const isEventInPast = isPast(eventEnd);

								return (
									<EventItem
										key={event.id}
										onClick={(e: React.MouseEvent) => {
											if (!isEventInPast) {
												onEventClick(event, e);
											}
										}}
										event={event}
										view="month"
										isFirstDay={isFirstDay}
										isLastDay={isLastDay}
									/>
								);
							}
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}