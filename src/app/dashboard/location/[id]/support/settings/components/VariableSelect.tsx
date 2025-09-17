'use client'
import { Button } from "@/components/ui"
import {

    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui";

import { VariableGroups } from "@/components/extensions";
import { CustomVariable, CustomVariableGroup } from "@/types";
import { Tag } from "lucide-react";
import { useState } from "react";

interface VariableSelectProps {
    variables?: CustomVariableGroup[]
    onSelect: (value: CustomVariable) => void
}


export function VariableSelect({ variables, onSelect }: VariableSelectProps) {
    const [open, setOpen] = useState(false)
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-expanded={open} className="size-5 hover:bg-foreground/10">
                    <Tag className="size-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 border-foreground/5">
                <Command>
                    <CommandInput placeholder="Search variables..." />
                    <CommandList>
                        <CommandEmpty>No variables found.</CommandEmpty>

                        {[...VariableGroups, ...(variables || [])].map((group) => (
                            <CommandGroup key={group.name}>
                                <p className="text-[0.6rem] font-medium text-muted-foreground uppercase">{group.name}</p>
                                {group.variables.map((v: CustomVariable) => (
                                    <CommandItem
                                        key={v.id}
                                        value={v.value}
                                        onSelect={() => {
                                            onSelect(v)
                                            setOpen(false)
                                        }}
                                    >
                                        <p>{v.label}</p>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                        ))}

                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover >
    )
}
