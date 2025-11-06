"use client"

import {

    PlusIcon,
    TextIcon,
    HashIcon,
    CalendarIcon,
    CheckIcon,
    BoxSelectIcon,
    ListIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NewField() {
    const fieldTypes = [
        { id: "text", name: "Text", icon: <TextIcon className="size-3" /> },
        { id: "number", name: "Number", icon: <HashIcon className="size-3" /> },
        { id: "date", name: "Date", icon: <CalendarIcon className="size-3" /> },
        { id: "boolean", name: "Checkbox", icon: <CheckIcon className="size-3" /> },
        { id: "select", name: "Select", icon: <BoxSelectIcon className="size-3" /> },
        { id: "multi-select", name: "Multi-Select", icon: <ListIcon className="size-3" /> },
    ]
    return (
        <ButtonGroup>
            <Button variant="outline" size="sm" className=" border-foreground/10">Add Field</Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="!pl-2  border-foreground/10">
                        <PlusIcon className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-foreground/10 w-[200px]">
                    <DropdownMenuGroup>
                        {fieldTypes.map((type) => (
                            <DropdownMenuItem key={type.id} className="flex cursor-pointer text-xs flex-row items-center justify-between gap-2">

                                <span>     {type.name}</span>
                                <span>     {type.icon}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>

                </DropdownMenuContent>
            </DropdownMenu>
        </ButtonGroup>
    )
}
