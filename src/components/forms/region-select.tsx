import {
    FormControl,
} from "@/components/forms/form";
import { Command, Button, CommandInput, CommandItem, CommandEmpty, CommandGroup, CommandList, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { cn } from "@/libs/utils";
import { ChevronsUpDown } from "lucide-react";
import { ScrollArea } from "@radix-ui/react-scroll-area";

import { useEffect, useState } from "react";
import { Regions } from "@/libs/data";

interface RegionSelectProps {
    value: string | undefined
    onChange: (value: string | null) => void
}

export function RegionSelect({ value, onChange }: RegionSelectProps) {
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
                        className={cn("w-full  justify-between", !value && "text-muted-foreground")}
                    >
                        {selected ? selected : "Select a state"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent align="start" className=" w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Seach state" />
                    <CommandList>
                        <CommandEmpty>No region found.</CommandEmpty>
                        <CommandGroup>
                            <ScrollArea className="overflow-y-auto  w-[210px] h-52">
                                {Regions.us.regions.map((region) => (
                                    <CommandItem
                                        value={region}
                                        key={region}
                                        onSelect={() => {
                                            setSelected(region);
                                            onChange(region);
                                            setOpen(false);
                                        }}
                                    >
                                        {region}
                                    </CommandItem>
                                ))}
                            </ScrollArea>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>


    )
}
