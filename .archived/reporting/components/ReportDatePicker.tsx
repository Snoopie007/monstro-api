"use client";
import React, { useEffect, useMemo } from "react";
import { addDays, format, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/libs/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useReportFilters } from "../provider/ReportContext";

export function ReportDatePicker() {
  const { filters, updateDateRange } = useReportFilters();

  // Initialize with default date range (last 30 days) if not set
  const defaultDateRange = useMemo(
    () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
    []
  );

  const currentDateRange = filters.dateRange || defaultDateRange;

  // Set default date range on mount if no range is set
  useEffect(() => {
    if (!filters.dateRange) {
      updateDateRange(defaultDateRange);
    }
  }, [filters.dateRange, updateDateRange, defaultDateRange]);

  const handleDateChange = (dateRange: DateRange | undefined) => {
    updateDateRange(dateRange);
  };

  const formatDateDisplay = (date: DateRange | undefined) => {
    if (!date?.from) {
      return <span>Pick a date range</span>;
    }

    if (date.to) {
      return (
        <>
          {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
        </>
      );
    }

    return format(date.from, "LLL dd, y");
  };

  return (
    <div className={cn("grid gap-2")}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] cursor-pointer flex h-auto py-2 items-center gap-2 text-xs rounded-sm justify-start text-left border-foreground/20",
              !currentDateRange?.from && "text-foreground/60"
            )}
          >
            <CalendarIcon size={14} />
            {formatDateDisplay(currentDateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={currentDateRange?.from}
            selected={currentDateRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
