'use client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/libs/utils";

export default function ThemeMenu() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="bg-transparent rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0  w-8 h-8  p-1 text-foreground hover:bg-accent ">

                    <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xs" align='center'>

                {['light', 'dark', 'system'].map((t, i) => (
                    <DropdownMenuItem key={i} className={cn('cursor-pointer capitalize')} onClick={() => setTheme(t)}>
                        {t}
                    </DropdownMenuItem>

                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
