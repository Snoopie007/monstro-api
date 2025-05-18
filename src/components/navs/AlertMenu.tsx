
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,

    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";



export function AlertMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='size-6'>
                    <Inbox size={14} className="" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>

            </DropdownMenuContent>
        </DropdownMenu>
    )
}
