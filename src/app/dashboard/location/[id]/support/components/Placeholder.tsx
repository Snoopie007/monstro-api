import { cn } from '@/libs/utils'
import React from 'react'

const bounce = 'size-1.5 bg-foreground rounded-full animate-bounce'


export function Placeholder() {
    return (
        <div className="flex flex-initial gap-1 p-3 bg-foreground/5 rounded-md w-fit">
            <div className={cn(bounce, '[animation-delay:-0.3s]')}></div>
            <div className={cn(bounce, '[animation-delay:-0.15s]')}></div>
            <div className={cn(bounce)}></div>
        </div>
    )
}
