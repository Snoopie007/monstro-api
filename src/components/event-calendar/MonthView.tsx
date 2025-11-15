"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	addDays,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
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
import type { CalendarEvent } from "@/types";
import { DefaultStartHour } from "@/components/event-calendar/constants";
import { getAllEventsForDay, getEventsForDay, getSpanningEventsForDay, sortEvents } from "@/libs/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEventVisibility } from "@/hooks";
import { cn } from "@/libs/utils";

interface MonthViewProps {
	currentDate: Date;
	events: CalendarEvent[];
	onEventSelect: (event: CalendarEvent) => void;
	onEventCreate: (startTime: Date) => void;
}


const DayCellStyle = cn(
	"group border-foreground/5 data-outside-cell:bg-muted/50",
	"data-outside-cell:text-muted/50 border-r border-b last:border-r-0 flex flex-col h-full"
)

export function MonthView({
	currentDate,
	events,
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

	function handleEventClick(event: CalendarEvent, e: React.MouseEvent) {
		e.stopPropagation();
		e.preventDefault();

		onEventSelect(event);
	}

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
							if (!day) return null; // Skip if day is undefined

							const dayEvents = getEventsForDay(events, day);
							const spanningEvents = getSpanningEventsForDay(events, day);
							const isCurrentMonth = isSameMonth(day, currentDate);
							const cellId = `month-cell-${day.toISOString()}`;
							const allDayEvents = [...spanningEvents, ...dayEvents];
							const allEvents = getAllEventsForDay(events, day);

							const isReferenceCell = weekIndex === 0 && dayIndex === 0;
							const visibleCount = isMounted
								? getVisibleEventCount(allDayEvents.length)
								: undefined;
							const hasMore =
								visibleCount !== undefined &&
								allDayEvents.length > visibleCount;
							const remainingCount = hasMore
								? allDayEvents.length - visibleCount
								: 0;

							return (
								<div key={day.toString()}
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
											"inline-flex w-6  h-auto items-center justify-center rounded-lg text-sm"
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
																	handleEventClick(event, e);
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
														<div key={event.id}
															className="aria-hidden:hidden"
															aria-hidden={isHidden ? "true" : undefined}
														>
															<DraggableEvent
																event={event}
																view="month"
																onClick={(e: React.MouseEvent) => {
																	handleEventClick(event, e);
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
													day={day} allEvents={allEvents}
													onEventClick={onEventSelect}
												/>
											)}
										</div>
									</DroppableCell>
								</div>
							);
						})}
					</div>
				))
				}
			</div >
		</div >
	);
}

interface HasMoreEventsProps {
	remainingCount: number;
	day: Date;
	allEvents: CalendarEvent[];
	onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

function HasMoreEvents({ remainingCount, day, allEvents, onEventClick }: HasMoreEventsProps) {
	return (
		<Popover modal>
			<PopoverTrigger onClick={(e: React.MouseEvent) => e.stopPropagation()}>
				<div className="text-muted-foreground flex flex-row items-start justify-start text-xs pt-1.5">
					+ {remainingCount}more

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

								return (
									<EventItem
										key={event.id}
										onClick={(e: React.MouseEvent) => {
											onEventClick(event, e);
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