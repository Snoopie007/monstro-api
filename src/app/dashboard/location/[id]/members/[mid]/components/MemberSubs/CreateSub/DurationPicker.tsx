import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, addMonths } from "date-fns";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { DateRange } from "react-day-picker";

interface DurationPickerProps {
    onChange: (date: DateRange) => void

}

export function DurationPicker({ onChange }: DurationPickerProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<'start' | 'end' | null>(null);
    const [date, setDate] = useState<DateRange>({
        from: new Date(),
        to: undefined,
    });


    const startPresets = useMemo(() => [
        { name: "Today", date: new Date() },
        { name: "Next Month 1st", date: startOfMonth(addMonths(new Date(), 1)) }
    ], []);

    const baseDate = date.from || new Date();

    const endPresets = useMemo(() => [
        { name: "Forever", date: undefined },
        ...([1, 2, 3, 6, 12].map(months => ({
            name: `${months} cycle${months > 1 ? 's' : ''} (${format(addMonths(baseDate, months), "MMM d")})`,
            months
        })))
    ], [baseDate]);

    const handleDateSelect = useCallback((d: Date) => {
        if (!d) return;
        const dTime = d.getTime();
        const fromTime = date.from?.getTime();
        const toTime = date.to?.getTime();
        if (selected === 'start') {
            if (!toTime || dTime > toTime) {
                setDate({ from: d, to: undefined });
            } else {
                setDate((prev) => ({ ...prev, from: d }));
            }
            setSelected('end');
        }

        if (selected === 'end') {
            if (!fromTime || dTime < fromTime || fromTime === dTime) {
                setDate({ from: d, to: undefined });
            } else {
                setDate((prev) => ({ ...prev, to: d }));
            }
            onChange(date);
            setOpen(false);
        }

    }, [onChange, selected]);

    const handlePresetSelect = useCallback((preset: typeof startPresets[number] | typeof endPresets[number], type: 'start' | 'end') => {
        let presetDate: Date | undefined;

        if ('date' in preset) {
            presetDate = preset.date;
        } else if ('months' in preset) {
            presetDate = addMonths(date.from || new Date(), preset.months);
        }

        const newDate = type === 'start'
            ? { from: presetDate, to: date.to }
            : { from: date.from, to: presetDate };

        setDate(newDate);
        onChange(newDate);

        if (type === 'start') {
            setSelected('end');
        } else {
            setOpen(false);
        }
    }, [date.from, date.to, onChange]);

    const handleDateClick = useCallback((type: 'start' | 'end') => (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(type);
        setOpen(true);
    }, []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                <div className="h-10 border border-foreground/10 rounded-sm px-3 py-2 flex flex-row items-center bg-background gap-1">
                    <CalendarIcon size={16} className="-mt-0.5 mr-1" />
                    <div className="flex flex-row items-center text-sm gap-3 text-foreground/80">
                        <span
                            className={`px-1 rounded-sm cursor-pointer ${selected === 'start' ? 'bg-indigo-600 text-white' : 'hover:bg-foreground/10'}`}
                            onClick={handleDateClick('start')}
                        >
                            {date.from ? format(date.from, "LLL dd, y") : ""}
                        </span>
                        <span>-</span>
                        <span
                            className={`px-1 rounded-sm cursor-pointer ${selected === 'end' ? 'bg-indigo-600 text-white' : 'hover:bg-foreground/10'}`}
                            onClick={handleDateClick('end')}
                        >
                            {date.to ? format(date.to, "LLL dd, y") : "Never"}
                        </span>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto flex flex-row overflow-hidden border-foreground/10  p-0" align="start" side="bottom">
                <Calendar
                    mode="range"
                    // month={selected === 'end' && date.from ? date.from : undefined}
                    disabled={(d) => d < (selected === 'start' ? new Date() : date.from || new Date())}
                    numberOfMonths={1}
                    selected={date}
                    onDayClick={handleDateSelect}
                />
                <div className="bg-foreground/5 p-4 w-[150px]">
                    <ul className="space-y-2">
                        {(selected === 'start' ? startPresets : endPresets).map(preset => (
                            <li
                                key={preset.name}
                                onClick={() => handlePresetSelect(preset, selected || 'start')}
                                className="text-xs cursor-pointer hover:text-indigo-500 font-medium"
                            >
                                {preset.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </PopoverContent>
        </Popover>
    );
}
