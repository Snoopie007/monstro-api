'use client'
import { useEffect, useState } from "react";
import { useTheme } from "next-themes"
import { cn } from "@/libs/utils"
import { Monitor, Moon, Sun } from "lucide-react"


export function ThemeMenu() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <div className="p-0.5 px-1">
            <div className="flex items-center bg-foreground/5  rounded-full px-1 py-0.5">
                <div
                    onClick={() => setTheme('system')}
                    className={cn(
                        "relative p-1 text-xs rounded-sm font-medium transition-colors",
                        "hover:text-foreground/80 z-10 cursor-pointer rounded-full",
                        theme === 'system' ? "text-foreground bg-foreground/10" : "text-foreground/60"
                    )}
                >
                    <Monitor className="size-3" />

                </div>
                <div
                    onClick={() => setTheme('light')}
                    className={cn(
                        "relative p-1 text-xs rounded-sm font-medium transition-colors",
                        "hover:text-foreground/80 z-10 cursor-pointer rounded-full",
                        theme === 'light' ? "text-foreground bg-foreground/10" : "text-foreground/60"
                    )}
                >
                    <Sun className="size-3" />

                </div>
                <div
                    onClick={() => setTheme('dark')}
                    className={cn(
                        "relative p-1 text-xs rounded-sm font-medium transition-colors",
                        "hover:text-foreground/80 z-10 cursor-pointer rounded-full",
                        theme === 'dark' ? "text-foreground bg-foreground/10" : "text-foreground/60"
                    )}
                >
                    <Moon className="size-3" />

                </div>
            </div>
        </div>
    )
}