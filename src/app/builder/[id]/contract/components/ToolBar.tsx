import { ButtonHTMLAttributes, HTMLProps, forwardRef } from 'react'

import { cn } from '@/libs/utils'
import { Button } from '@/components/ui/button'


export type ToolbarWrapperProps = {
    shouldShowContent?: boolean
    isVertical?: boolean
} & HTMLProps<HTMLDivElement>



export type ToolbarDividerProps = {
    horizontal?: boolean
} & HTMLProps<HTMLDivElement>

const ToolbarDivider = forwardRef<HTMLDivElement, ToolbarDividerProps>(({ horizontal, className, ...rest }, ref) => {
    const dividerClassName = cn(
        'bg-foreground/5',
        horizontal
            ? 'w-full min-w-[1.5rem] h-[1px] my-1 first:mt-0 last:mt-0'
            : 'h-full min-h-[1.5rem] w-[1px] mx-1 first:ml-0 last:mr-0',
        className,
    )

    return <div className={dividerClassName} ref={ref} {...rest} />
})

ToolbarDivider.displayName = 'Toolbar.Divider'

export type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean
    activeClassname?: string
    tooltip?: string
    tooltipShortcut?: string[]
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "foreground" | "menu"
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(({
    children, variant = 'ghost', active, className, tooltip, tooltipShortcut, activeClassname, ...rest
}, ref,) => {

    return (
        <Button
            className={cn('size-6 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md',
                className, { "bg-foreground/10 text-foreground": active }, activeClassname)}
            variant="ghost"
            size="icon"
            ref={ref}
            {...rest}
        >
            {children}
        </Button>
    )
})


ToolbarButton.displayName = 'ToolbarButton'

export const Toolbar = {
    Divider: ToolbarDivider,
    Button: ToolbarButton,
}