"use client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/libs/utils";

interface DayFieldPopoverProps {
    value: string | undefined;
    onChange: (date: string | undefined) => void;
}

export function DayFieldPopover({ value, onChange }: DayFieldPopoverProps) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-2/3 flex items-center justify-between text-left font-normal rounded-lg border-foreground/10",
                        !value && "text-muted-foreground"
                    )}
                >
                    {value ? (
                        <span className="text-sm">{format(value, "PPP")}</span>
                    ) : (
                        <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto size-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 border-foreground/10 overflow-hidden"
                align="start"
            >
                <Calendar
                    mode="single"
                    captionLayout="dropdown-months"
                    selected={value ? new Date(value) : undefined}
                    onSelect={(date) => {
                        if (date) {
                            onChange(date.toISOString());
                        }
                        setOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                />
            </PopoverContent>
        </Popover>
    );
}
