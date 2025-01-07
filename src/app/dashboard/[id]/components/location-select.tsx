

import {
    Popover, PopoverContent, PopoverTrigger,
    Command, CommandInput, CommandItem, CommandEmpty, CommandGroup, CommandList
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/libs/utils";
import { Location } from "@/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";



export default function LocationSelect({ locationId }: { locationId: number }) {
    const [open, setOpen] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selected, setSelected] = useState<Location>();
    const session = useSession();
    const { push } = useRouter();


    useEffect(() => {
        const locationList = session?.data?.user.locations;
        const activeLocation = locationList.find((location: Location) => location.id == locationId);

        if (session) {
            setLocations(locationList);
        }
        if (activeLocation) {
            setSelected(activeLocation);
        }
    }, [locationId]);


    return (
        < Popover open={open} onOpenChange={setOpen} >
            <PopoverTrigger asChild>

                <Button
                    variant="outline"
                    role="combobox"
                    className="h-auto py-1 px-2 text-xs rounded-sm border-0"
                >
                    {selected ? selected.name : "Select a location"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 stroke-black dark:stroke-white" />
                </Button>

            </PopoverTrigger>
            <PopoverContent align="start" className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandList>
                        <CommandEmpty>No location found.</CommandEmpty>
                        <CommandGroup>
                            <ScrollArea className="overflow-y-auto  w-[250px] h-52">
                                {locations.map((location, i) => (
                                    <CommandItem
                                        value={`${location.id}`}
                                        key={location.id}
                                        className="font-medium"
                                        onSelect={() => {
                                            setSelected(location);
                                            setOpen(false);
                                            const route = `/dashboard/${location.id}`;
                                            push(route);
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
    )
}
