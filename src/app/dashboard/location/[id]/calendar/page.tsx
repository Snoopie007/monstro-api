"use client";
import { use, useEffect, useState } from "react";
import { BigCalendar } from "./components/BigCalendar";
import { useSessionCalendar } from "./providers/SessionCalendarProvider";
import { Calendar } from "@/components/ui/calendar"


import { CalendarEvent } from "@/types";
import { tryCatch } from "@/libs/utils";
import DayList from "./components/DayList";


function CalendarPage(props: { params: Promise<{ id: string }> }) {
	const { id } = use(props.params);

	const { currentDate, setCurrentDate, currentMonth, setCurrentMonth } = useSessionCalendar()
	const [isLoading, setIsLoading] = useState(true)
	const [events, setEvents] = useState<CalendarEvent[]>([])

	useEffect(() => {
		const newMonth = currentDate.getMonth();
		if (currentMonth === null || currentMonth !== newMonth) {
			setCurrentMonth(newMonth);
			fetchEvents();
		}
	}, [currentDate]);


	async function fetchEvents() {
		setIsLoading(true)
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${id}/events?date=${currentDate.toISOString()}`, {
				cache: 'no-store'
			})
		)

		setIsLoading(false)
		if (error || !result || !result.ok) return

		const data = await result.json()
		console.log("new events", data)
		setEvents(data)
	}


	return (
		<div className="flex flex-row h-full bg-foreground/5">

			<div className="flex-1 h-full">
				<BigCalendar events={events} />
			</div>
			<div className="flex-initial w-[300px] flex flex-col pl-0 pr-2 pt-2 pb-1 space-y-2">

				<Calendar
					mode="single"
					fromDate={new Date()}
					selected={currentDate}
					onSelect={(date) => {
						if (date) {
							setCurrentDate(date)
						}
					}}
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

export default CalendarPage;