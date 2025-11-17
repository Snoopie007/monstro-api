import { useState } from "react";
import {
	addDays,
	addMonths,
	subMonths,
	subWeeks,
	addWeeks,
} from "date-fns";
import type { CalendarView } from "@/types";
import { AgendaDaysToShow } from "../components/event-calendar/constants";

interface UseDateNavigationProps {
	currentDate?: Date;
	view: CalendarView;
	onDateChange?: (date: Date) => void;
}

export function useDateNavigation({
	currentDate: externalCurrentDate,
	view,
	onDateChange,
}: UseDateNavigationProps) {
	const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());

	// Use external date if provided, otherwise use internal state
	const currentDate = externalCurrentDate ?? internalCurrentDate;

	const handlePrevious = () => {
		let newDate: Date;

		if (view === "month") {
			newDate = subMonths(currentDate, 1);
		} else if (view === "week") {
			newDate = subWeeks(currentDate, 1);
		} else if (view === "day") {
			newDate = addDays(currentDate, -1);
		} else if (view === "agenda") {
			newDate = addDays(currentDate, -AgendaDaysToShow);
		} else {
			newDate = subMonths(currentDate, 1);
		}

		// Use external handler if provided, otherwise use internal state
		if (onDateChange) {
			onDateChange(newDate);
		} else {
			setInternalCurrentDate(newDate);
		}
	};

	const handleNext = () => {
		let newDate: Date;

		if (view === "month") {
			newDate = addMonths(currentDate, 1);
		} else if (view === "week") {
			newDate = addWeeks(currentDate, 1);
		} else if (view === "day") {
			newDate = addDays(currentDate, 1);
		} else if (view === "agenda") {
			newDate = addDays(currentDate, AgendaDaysToShow);
		} else {
			newDate = addMonths(currentDate, 1);
		}

		// Use external handler if provided, otherwise use internal state
		if (onDateChange) {
			onDateChange(newDate);
		} else {
			setInternalCurrentDate(newDate);
		}
	};

	const handleToday = () => {
		const today = new Date();

		// Use external handler if provided, otherwise use internal state
		if (onDateChange) {
			onDateChange(today);
		} else {
			setInternalCurrentDate(today);
		}
	};

	return {
		currentDate,
		handlePrevious,
		handleNext,
		handleToday,
	};
}

