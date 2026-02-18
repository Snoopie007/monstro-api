import { useState } from "react";
import type { CalendarEvent } from "@/types/calendar";

export function useEventDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null
	);
	const [clickedDateTime, setClickedDateTime] = useState<Date | undefined>(
		undefined
	);

	const openDialog = (event?: CalendarEvent, datetime?: Date) => {
		if (event) {
			setSelectedEvent(event);
		} else {
			setSelectedEvent(null);
		}
		
		if (datetime) {
			setClickedDateTime(datetime);
		} else {
			setClickedDateTime(undefined);
		}
		
		setIsOpen(true);
	};

	const closeDialog = () => {
		setIsOpen(false);
		setSelectedEvent(null);
		setClickedDateTime(undefined);
	};

	return {
		isOpen,
		selectedEvent,
		clickedDateTime,
		openDialog,
		closeDialog,
		setSelectedEvent,
		setClickedDateTime,
	};
}
