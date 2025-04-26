'use client'
import {
    FormControl,
} from "@/components/forms/form";
import { Command, Button, CommandInput, CommandItem, CommandEmpty, CommandGroup, CommandList, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { cn } from "@/libs/utils";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Regions } from "@/libs/data";

interface RegionSelectProps {
    value: string | undefined
    onChange: (value: string | null) => void
    className?: string
}

export function RegionSelect({ value, onChange, className }: RegionSelectProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<string | undefined>(undefined);
    useEffect(() => {
        setSelected(value)
    }, [])
    return (

        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full bg-background border border-gray-200 cursor-pointer  rounded-xs font-normal justify-between", className)}
                    >
                        {selected ? selected : "Select a state"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent align="start" className={cn("w-[200px] p-0 rounded-sm")}>
                <Command className={cn("bg-background text-foreground rounded-sm ")}>
                    <CommandInput placeholder="Seach state" className="h-auto py-2" />
                    <CommandList >
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandGroup>
                            {Regions.us.regions.map((region) => (
                                <CommandItem
                                    value={region}
                                    key={region}
                                    className="rounded-xs text-foreground cursor-pointer"
                                    onSelect={() => {
                                        setSelected(region);
                                        onChange(region);
                                        setOpen(false);
                                    }}
                                >
                                    {region}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>


    )
}
