"use client";

import React from "react";
import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "lucide-react";

import type { CalendarView } from "@/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/libs/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/GroupButton";

interface CalendarToolbarProps {
	viewTitle: React.ReactNode;
	view: CalendarView;
	onPrevious: () => void;
	onNext: () => void;
	onToday: () => void;
	onViewChange: (view: CalendarView) => void;
	className?: string;
}

export const CalendarToolbar = React.memo(function CalendarToolbar({
	viewTitle,
	view,
	onPrevious,
	onNext,
	onToday,
	onViewChange,
	className,
}: CalendarToolbarProps) {
	return (
		<div className={cn("flex items-center justify-between pb-2", className)}>
			<div className="flex items-center gap-1 sm:gap-4">
				<ButtonGroup>
					<div
						className={cn(
							"bg-foreground/5 rounded-lg px-4 h-10 flex items-center justify-center",
							"border border-foreground/10 text-sm font-semibold"
						)}
					>
						{viewTitle}
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={onPrevious}
						className="border-foreground/10 size-10"
						aria-label="Previous"
					>
						<ChevronLeftIcon size={16} aria-hidden="true" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={onNext}
						className="border-foreground/10 size-10"
						aria-label="Next"
					>
						<ChevronRightIcon size={16} aria-hidden="true" />
					</Button>
				</ButtonGroup>
			</div>
			<ButtonGroup>
				<Button
					variant="outline"
					onClick={onToday}
					className="border-foreground/10"
				>
					<span className=" max-[479px]:sr-only">Today</span>
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							className="border-foreground/10 flex flex-row items-center gap-2"
						>
							<span>{view.charAt(0).toUpperCase() + view.slice(1)}</span>
							<ChevronDownIcon
								className="text-muted-foreground size-4 -mt-0.5"
								aria-hidden="true"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-32 border-border/20">
						<DropdownMenuItem onClick={() => onViewChange("month")}>
							Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onViewChange("week")}>
							Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onViewChange("day")}>
							Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onViewChange("agenda")}>
							Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>
		</div>
	);
});

CalendarToolbar.displayName = "CalendarToolbar";
