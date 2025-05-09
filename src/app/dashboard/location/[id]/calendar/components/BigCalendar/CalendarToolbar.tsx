import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react'
import {
    ToggleGroup,
    ToggleGroupItem,
} from '@/components/ui';
import {
    format,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { cn } from '@/libs/utils';
import { CalendarView } from '@/types';


interface CalendarToolbarProps {
    date: Date;
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onNavigate: (date: Date) => void;
}

export function CalendarToolbar({
    date,
    view,
    onViewChange,
    onNavigate
}: CalendarToolbarProps) {
    const handlePrevious = () => {
        if (view === 'month') {
            onNavigate(subMonths(date, 1));
        } else if (view === 'week') {
            onNavigate(subWeeks(date, 1));
        } else if (view === 'day') {
            onNavigate(subDays(date, 1));
        }
    };

    const handleNext = () => {
        if (view === 'month') {
            onNavigate(addMonths(date, 1));
        } else if (view === 'week') {
            onNavigate(addWeeks(date, 1));
        } else if (view === 'day') {
            onNavigate(addDays(date, 1));
        }
    };

    const handleToday = () => {
        onNavigate(new Date());
    };

    const getDateDisplay = () => {
        if (view === 'month') {
            return format(date, 'MMMM yyyy');
        } else if (view === 'week') {
            const start = startOfWeek(date);
            const end = endOfWeek(date);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        } else {
            return format(date, 'EEEE, MMMM d, yyyy');
        }
    };

    return (
        <div className="flex items-center border-b border-foreground/5 justify-between py-1.5">
            <div className='flex flex-row gap-4 items-center'>
                <div className="border-r text-sm px-4 py-1 font-semibold">
                    {getDateDisplay()}
                </div>
                <div className="grid  grid-cols-4 items-center border border-foreground/10 rounded-sm">
                    <div onClick={handleToday} className='col-span-2 text-xs px-4 py-2 font-semibold hover:bg-foreground/5 cursor-pointer'>
                        Today
                    </div>
                    <div className='col-span-1 p-2 border-x border-foreground/10 hover:bg-foreground/5 cursor-pointer'
                        onClick={handlePrevious}
                    >
                        <ChevronLeftIcon size={16} />
                    </div>

                    <div className='col-span-1 p-2 hover:bg-foreground/5 cursor-pointer'
                        onClick={handleNext}
                    >
                        <ChevronRightIcon size={16} />
                    </div>
                </div>
            </div>

            <div className="flex-initial gap-2 pr-4">
                <ToggleGroup type="single" className='border border-foreground/10 rounded-sm gap-0'
                    value={view}
                    onValueChange={onViewChange}
                >
                    {(['month', 'week', 'day'] as CalendarView[]).map((viewType) => (
                        <ToggleGroupItem
                            key={viewType}
                            value={viewType}
                            className={cn("w-16 rounded-none font-semibold text-xs h-8 cursor-pointer", {
                                'border-x': viewType === 'week'
                            })}
                        >
                            {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </div>


    );
}
