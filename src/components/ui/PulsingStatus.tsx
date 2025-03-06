import * as React from "react"
import { cn } from "@/libs/utils"

export interface PulsingStatusProps extends React.HTMLAttributes<HTMLDivElement> {
    live?: boolean;
}

const PulsingStatus = React.forwardRef<HTMLDivElement, PulsingStatusProps>(
    ({ className, live = true, ...props }, ref) => {
        const baseClasses = "relative flex size-2 group";
        const animationClasses = "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75";
        const dotClasses = "relative inline-flex size-2 rounded-full";

        return (
            <span ref={ref} className={cn(baseClasses, className)} data-live={live} {...props}>
                <span className={cn(animationClasses, "group-data-[live=true]:bg-green-400 group-data-[live=false]:bg-red-400")}></span>
                <span className={cn(dotClasses, "group-data-[live=true]:bg-green-500 group-data-[live=false]:bg-red-500")}></span>
            </span>
        )
    }
)

PulsingStatus.displayName = "PulsingStatus"

export { PulsingStatus }
