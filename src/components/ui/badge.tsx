import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/libs/utils'

const badgeVariants = cva(
    'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
                destructive:
                    'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'text-foreground border-foreground/20 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
            },
            size: {
                tiny: 'text-[0.65rem]',
                small: 'text-xs',
                medium: 'text-sm',
                large: 'text-base',
            },
            member: {
                incomplete: 'bg-yellow-300 text-yellow-800',
                active: 'bg-green-300 text-green-800',
                canceled: 'bg-red-300 text-red-800',
                paused: 'bg-gray-300 text-gray-800',
                inactive: 'bg-gray-300 text-gray-800',
                past_due: 'bg-orange-300 text-orange-800',
                incomplete_expired: 'bg-red-300 text-red-800',
                unpaid: 'bg-red-300 text-red-800',
                trialing: 'bg-blue-300 text-blue-800',
                archived: 'bg-red-300 text-red-800',
            },
            roles: {
                red: 'bg-red-300  text-red-800',
                green: 'bg-green-300 text-green-800',
                blue: 'bg-blue-300 text-blue-800',
                pink: 'bg-pink-300 text-pink-800',
                cyan: 'bg-cyan-300 text-cyan-800',
                lime: 'bg-lime-300 text-lime-800',
                orange: 'bg-orange-300 text-orange-800',
                fuchsia: 'bg-fuchsia-300 text-fuchsia-800',
                sky: 'bg-sky-300 text-sky-800',
                lemon: 'bg-lime-300 text-lime-800',
                purple: 'bg-purple-300 text-purple-800',
                yellow: 'bg-yellow-300 text-yellow-800',
            },
            sub: {
                active: 'bg-green-300 text-green-800',
                incomplete: 'bg-yellow-300 text-yellow-800',
                inactive: 'bg-yellow-300 text-yellow-800',
                trialing: 'bg-blue-300 text-blue-800',
                past_due: 'bg-orange-300 text-orange-800',
                paused: 'bg-gray-300 text-gray-800',
                canceled: 'bg-red-300 text-red-800',
                unpaid: 'bg-red-300 text-red-800',
                incomplete_expired: 'bg-red-300 text-red-800',
                archived: 'bg-red-300 text-red-800',
            },
            inv: {
                unpaid: 'bg-red-300 text-red-800',
                paid: 'bg-green-300 text-green-800',
                uncollectible: 'bg-yellow-300 text-yellow-800',
                draft: 'bg-gray-300 text-gray-800',
                void: 'bg-red-300 text-red-800',
            },
            pkg: {
                active: 'bg-green-300 text-green-800',
                expired: 'bg-red-300 text-red-800',
                incomplete: 'bg-yellow-300 text-yellow-800',
                inactive: 'bg-yellow-300 text-yellow-800',
                completed: 'bg-blue-300 text-blue-800',
            },
            transaction: {
                paid: 'bg-green-300 text-green-800',
                failed: 'bg-red-300 text-red-800',
                incomplete: 'bg-yellow-300 text-yellow-800',
            },
            status: {
                open: 'bg-indigo-300 text-indigo-800',
                closed: 'bg-gray-300 text-gray-800',
                escalated: 'bg-orange-300 text-orange-800',
            },
            severity: {
                low: 'bg-green-300 text-green-800',
                medium: 'bg-yellow-300 text-yellow-800',
                high: 'bg-orange-300 text-orange-800',
                urgent: 'bg-red-300 text-red-800',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
)
function Badge({
    className,
    variant,
    inv,
    size,
    member,
    roles,
    sub,
    pkg,
    transaction,
    status,
    severity,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span'
    return (
        <Comp
            data-slot="badge"
            className={cn(
                badgeVariants({
                    variant,
                    inv,
                    size,
                    member,
                    roles,
                    sub,
                    pkg,
                    transaction,
                    status,
                    severity,
                }),
                className
            )}
            {...props}
        />
    )
}
export { Badge, badgeVariants }
