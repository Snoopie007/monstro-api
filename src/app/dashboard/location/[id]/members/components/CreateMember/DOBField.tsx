'use client'
import { Button, PopoverContent, Popover, PopoverTrigger, Calendar } from '@/components/ui';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/libs/utils';
import { FormControl } from '@/components/forms';
import { useState } from 'react';

interface BirthdayFieldProps {
    value: string | undefined;
    onChange: (date: string | undefined) => void;
}

export function BirthdayField({ value, onChange }: BirthdayFieldProps) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant={"outline"}
                        className={cn("w-full flex items-center justify-between text-left font-normal rounded-md border-foreground/10",
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
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-foreground/10 overflow-hidden" align="start">
                <Calendar
                    mode="single"
                    selected={value ? new Date(value) : undefined}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                        if (date) {
                            onChange(date.toISOString());
                        }
                        setOpen(false);
                    }}
                    disabled={(date) =>
                        date > new Date()
                    }

                />
            </PopoverContent>
        </Popover>
    )
}
