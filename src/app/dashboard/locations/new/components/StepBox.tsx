'use client'

import React from 'react'
import { cn } from '@/libs/utils'

interface StepBoxContentProps extends React.HTMLAttributes<HTMLDivElement> { }

const StepBoxContent: React.FC<StepBoxContentProps> = ({ children, className, ...props }) => {
    return (
        <div className={cn("flex flex-col gap-2 group-data-[active=false]:hidden", className)} {...props}>
            <div className="space-y-2 ">
                {children}
            </div>
        </div>
    )
}

interface StepBoxHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description: string
}

const StepBoxHeader: React.FC<StepBoxHeaderProps> = ({ title, description, className, ...props }) => {
    return (
        <div className={cn("flex flex-col items-start space-y-1 text-foreground cursor-pointer group-data-[active=false]:hidden", className)} {...props}>

            <div className="font-semibold text-lg leading-none ">{title}</div>
            <p className="text-muted-foreground text-sm ">{description}</p>
        </div>
    )
}

interface StepBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    active: boolean
    children: React.ReactNode
}

const StepBox = React.forwardRef<HTMLDivElement, StepBoxProps>(
    ({ active, children, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                data-active={active}

                className={cn("group space-y-3", className)} {...props}
            >
                {children}


            </div>
        )
    }
)
StepBox.displayName = "StepBox"

export {
    StepBox,
    StepBoxContent,
    StepBoxHeader
}
