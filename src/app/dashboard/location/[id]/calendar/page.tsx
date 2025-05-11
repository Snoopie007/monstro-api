"use client";
import { use, useEffect, useState } from "react";
// import { BigCalendar } from "./components/BigCalendar";
// import { useSessionCalendar } from "./providers/SessionCalendarProvider";
import { Calendar } from "@/components/ui/calendar"


import { CalendarEvent } from "@/types";
import { sleep, tryCatch } from "@/libs/utils";
import DayList from "./components/DayList";


export default function CalendarPage(props: { params: Promise<{ id: string }> }) {
	const { id } = use(props.params);

	// const { currentDate, setCurrentDate, currentMonth, setCurrentMonth, isLoading, setIsLoading } = useSessionCalendar()
	const [events, setEvents] = useState<CalendarEvent[]>([])

	// useEffect(() => {
	// 	const newMonth = currentDate.getMonth();
	// 	if (currentMonth === null || currentMonth !== newMonth) {
	// 		setCurrentMonth(newMonth);
	// 		fetchEvents();
	// 	}
	// }, [currentDate]);


	// async function fetchEvents() {
	// 	setIsLoading(true)
	// 	const { result, error } = await tryCatch(
	// 		fetch(`/api/protected/loc/${id}/events?date=${currentDate.toISOString()}`)
	// 	)

	// 	if (error || !result || !result.ok) {
	// 		setIsLoading(false)
	// 		return
	// 	}
	// 	const data = await result.json()
	// 	setEvents(data)
	// 	setIsLoading(false)
	// }


	return (
		<div className="flex flex-row h-full bg-foreground/5">

			<div className="flex-1 h-full">
				{/* <BigCalendar events={events} /> */}
			</div>
			<div className="flex-initial w-[300px] flex flex-col pl-0 pr-2 pt-2 pb-1 space-y-2">

				<Calendar
					mode="single"
					fromDate={new Date()}
					selected={new Date()}
					// onSelect={(date) => {
					// 	if (date) {
					// 		setCurrentDate(date)
					// 	}
					// }}
					className="rounded-lg border border-foreground/10 bg-background"
				/>
				<DayList lid={id} events={events} />

			</div>
			{/* {isSidebarOpen && selectedSession && (
				<Sidebar
					session={{ ...selectedSession, locationId }}
					reservations={reservations}
					onClose={handleSidebarClose}
				/>
			)} */}
		</div>
	);
};

