"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { useCalendarDnd } from "@/components/event-calendar";
import { cn } from "@/components/event-calendar/utils";

interface DroppableCellProps {
  id: string;
  date: Date;
  time?: number; // For week/day views, represents hours (e.g., 9.25 for 9:15)
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DroppableCell({
  id,
  date,
  time,
  children,
  className,
  onClick,
}: DroppableCellProps) {
  const { activeEvent } = useCalendarDnd();

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      time,
    },
  });

  // Format time for display in tooltip (only for debugging)
  const formattedTime =
    time !== undefined
      ? `${Math.floor(time)}:${Math.round((time - Math.floor(time)) * 60)
          .toString()
          .padStart(2, "0")}`
      : null;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "group relative rounded-[4px] data-dragging:bg-accent flex h-full flex-col overflow-hidden sm:px-1 cursor-pointer",
        "bg-transparent dark:bg-inherit dark:hover:bg-foreground/10 hover:bg-foreground/10 transition-colors duration-200 ease-out",
        className
      )}
      title={formattedTime ? `${formattedTime}` : undefined}
      data-dragging={isOver && activeEvent ? true : undefined}
    >
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out h-full w-full flex items-center justify-center text-muted-foreground">
        +
      </span>
      {children}
    </div>
  );
}
