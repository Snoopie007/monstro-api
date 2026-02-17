import { useEffect } from "react";
import type { CalendarView } from "@/types/calendar";

interface UseCalendarKeyboardShortcutsProps {
	isDialogOpen: boolean;
	onViewChange: (view: CalendarView) => void;
}

export function useCalendarKeyboardShortcuts({
	isDialogOpen,
	onViewChange,
}: UseCalendarKeyboardShortcutsProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Skip if user is typing in an input, textarea or contentEditable element
			// or if the event dialog is open
			if (
				isDialogOpen ||
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target instanceof HTMLElement && e.target.isContentEditable)
			) {
				return;
			}

			switch (e.key.toLowerCase()) {
				case "m":
					onViewChange("month");
					break;
				case "w":
					onViewChange("week");
					break;
				case "d":
					onViewChange("day");
					break;
				case "a":
					onViewChange("agenda");
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isDialogOpen, onViewChange]);
}
