'use client'

import React from 'react'
import { cn } from '@/libs/utils'

export interface StepBoxContentProps extends React.HTMLAttributes<HTMLDivElement> { }

export const StepBoxContent: React.FC<StepBoxContentProps> = ({ children, className, ...props }) => {
    return (
        <div className={cn("flex flex-col gap-2 group-data-[active=false]:hidden", className)} {...props}>
            <div className="space-y-2 ">
                {children}
            </div>
        </div>
    )
}

export interface StepBoxHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description: string
}

export const StepBoxHeader: React.FC<StepBoxHeaderProps> = ({ title, description, className, ...props }) => {
    return (
        <div className={cn("flex flex-col items-start space-y-1 text-black cursor-pointer group-data-[active=false]:hidden", className)} {...props}>

            <div className="font-semibold text-lg leading-none ">{title}</div>
            <p className="text-gray-600 text-sm ">{description}</p>
        </div>
    )
}

export interface StepBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    active: boolean
    completed: boolean
    children: React.ReactNode
}

const StepBox = React.forwardRef<HTMLDivElement, StepBoxProps>(
    ({ active, completed, children, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                data-active={active}
                data-completed={completed}
                className={cn("group text-black space-y-3", className)} {...props}
            >
                {children}


            </div>
        )
    }
)
StepBox.displayName = "StepBox"

export default StepBox
