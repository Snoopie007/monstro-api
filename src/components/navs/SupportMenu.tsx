
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,

    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleHelp } from "lucide-react";



export function SupportMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="bg-transparent rounded-sm h-8 w-8 p-1 text-foreground  hover:bg-accent">
                    <CircleHelp size={16} className="" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>

                <DropdownMenuItem className='cursor-pointer'>
                    <Link href={`#`}>Support Articles</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <Link href={`#`}>Support Center</Link>
                </DropdownMenuItem>

                <DropdownMenuItem>Share Feedback</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
