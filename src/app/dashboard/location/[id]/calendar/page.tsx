"use client";
import { use, useEffect, useState } from "react";
import { BigCalendar } from "./components/BigCalendar";
import { useSessionCalendar } from "./providers/SessionCalendarProvider";
import { CalendarEvent, ProgramSession } from "@/types";
import { tryCatch } from "@/libs/utils";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import Loading from "@/components/loading";


function CalendarPage(props: { params: Promise<{ id: string }> }) {
	const { id } = use(props.params);
	const { currentDate } = useSessionCalendar()
	const { events, isLoading } = useCalendarEvents(id, currentDate.toISOString())


	if (isLoading) {
		return <Loading />
	}

	return (
		<div className="flex flex-row h-full">

			<div className="flex-1 h-full">
				<BigCalendar events={events} selectedDay={new Date()} />
			</div>
			<div className="flex-initial w-[350px] border-l border-foreground/5">


				{/* {isSidebarOpen && selectedSession && (
				<Sidebar
					session={{ ...selectedSession, locationId }}
					reservations={reservations}
					onClose={handleSidebarClose}
				/>
			)} */}
			</div>

		</div>
	);
};

export default CalendarPage;