
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
    ScrollArea
} from "@/components/ui"

import { useCallback, useState } from 'react'
import { Toolbar } from "../ToolBar"
import { VariableGroups } from "@/components/extensions"
import { Variable } from "@/components/extensions/Variables/types"
import { VariableIcon } from "lucide-react"




interface VariablePickerProps {
    onChange: (value: Variable) => void // eslint-disable-line no-unused-vars

}

export function VariablePicker({ onChange }: VariablePickerProps) {
    const [open, setOpen] = useState(false)
    const selectVariable = useCallback((variable: Variable) => () => {
        onChange(variable)
        setOpen(false)
    }, [onChange])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Toolbar.Button>
                    <VariableIcon className='size-4' />
                </Toolbar.Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
                <Command>
                    <CommandInput placeholder="Search variable..." />
                    <CommandList>
                        <CommandEmpty>No variable found.</CommandEmpty>

                        <ScrollArea className="h-[300px]">
                            {VariableGroups.map((group, i) => (
                                <CommandGroup key={i} heading={group.name}>
                                    <div className="px-1 ">
                                        {group.variables.map((variable) => (
                                            <CommandItem key={variable.id}
                                                value={variable.value}
                                                className="font-medium"
                                                onSelect={selectVariable(variable)}
                                            >
                                                {variable.label}
                                            </CommandItem>
                                        ))}
                                    </div>
                                </CommandGroup>
                            ))}
                        </ScrollArea>

                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>

    )
}