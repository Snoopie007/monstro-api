'use client'

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent, Calendar } from "@/components/ui";
import { CalendarIcon } from "lucide-react";
import { format, addMonths } from "date-fns";
import { useCallback } from "react";


interface EndDayPickerProps {
    onChange: (date: Date | null) => void;
    startDate: Date;
    endDate: Date | null;
}

export function EndDayPicker({ onChange, startDate, endDate }: EndDayPickerProps) {
    const [open, setOpen] = useState(false);
    const [end, setEnd] = useState<Date | null>(endDate);

    const start = new Date(startDate);
    const handleDateSelect = useCallback((date: Date | null) => {
        setEnd(date);
        onChange(date);
        setOpen(false);
    }, [onChange]);

    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger>
                    <div className="h-8 border border-foreground/10 rounded-sm px-3 py-2 flex flex-row items-center bg-background gap-1">
                        <CalendarIcon className="mr-1 size-3.5" />
                        <div className="flex flex-row items-center text-sm gap-3 text-foreground/80">
                            <span className="px-1 rounded-sm text-xs">
                                {end ? format(end, "LLL dd, y") : "Forever"}
                            </span>
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto flex flex-row overflow-hidden border-foreground/10 p-0" align="start" side="bottom">
                    <div className="calendar-wrapper">
                        <Calendar
                            mode="single"
                            disabled={(date: Date) => date < start}
                            selected={end || undefined}

                        />
                    </div>
                    <div className="bg-foreground/5 p-4 w-[180px]">
                        <ul className="space-y-3">
                            {[1, 2, 3, 6, 12].map((months) => (
                                <li
                                    key={months}
                                    onClick={() => handleDateSelect(addMonths(start, months))}
                                    className="text-xs cursor-pointer flex flex-row items-center gap-1"
                                >
                                    <span className="text-xs cursor-pointer hover:text-indigo-500 font-medium">
                                        {months} {months === 1 ? 'cycle' : 'cycles'}
                                    </span>
                                    <span className="text-xs text-foreground/50">
                                        ({format(addMonths(start, months), "MMM d, yyyy")})
                                    </span>
                                </li>
                            ))}
                            <li
                                onClick={() => handleDateSelect(null)}
                                className="text-xs cursor-pointer hover:text-indigo-500 font-medium"
                            >
                                Never
                            </li>
                        </ul>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}