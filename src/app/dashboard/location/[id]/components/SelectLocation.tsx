

import {
    Popover, PopoverContent,
    Command, CommandInput, CommandItem, CommandEmpty, CommandGroup, CommandList,
    PopoverTrigger
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Location } from "@/types";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { cn } from "@/libs/utils";



export default function LocationSelect({ locationId }: { locationId: string }) {
    const [open, setOpen] = useState<boolean>(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const { push } = useRouter();
    const { data: session } = useSession();

    useEffect(() => {
        if (locationId) {
            setSelectedLocation(session?.user.locations.find((location: Location) => `${location.id}` === locationId));
        }
    }, [locationId, session?.user.locations])

    function handleSelect(location: Location) {

        setOpen(false);
        if (`${location.id}` === locationId) return;
        setSelectedLocation(location);
        push(`/dashboard/location/${location.id}`);
    }

    return (
        <div className="relative">


            < Popover open={open} onOpenChange={setOpen} >
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "h-8 gap-2 px-4 text-sm rounded-lg bg-muted/50 ",
                            "hover:bg-muted/80 hover:text-foreground  cursor-pointer"
                        )}

                    >
                        {selectedLocation ? selectedLocation.name : "Select a location"}
                        <ChevronsUpDown className=" size-4 -mt-0.5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[280px] p-0 border-foreground/10">
                    <Command>
                        <CommandInput placeholder="Search location..." className="  h-10" />
                        <CommandList>
                            <CommandEmpty>No location found.</CommandEmpty>
                            <CommandGroup>
                                <ScrollArea className="overflow-y-auto  w-full h-40">
                                    {session?.user.locations.map((location: Location) => (
                                        <CommandItem
                                            value={`${location.id}`}
                                            key={location.id}
                                            className="font-semibold text-[0.8rem] rounded-lg cursor-pointer"
                                            onSelect={() => {
                                                handleSelect(location);
                                            }}
                                        >
                                            {location.name}
                                        </CommandItem>
                                    ))}
                                </ScrollArea>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover >
        </div>
    )
}
