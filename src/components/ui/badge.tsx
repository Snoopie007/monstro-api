import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/libs/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5  text-xs uppercase rounded-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground ",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground ",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        active: "bg-green-300 text-green-800",
        inactive: "bg-red-300 text-red-800",
      },
      size: {
        tiny: "text-[0.65rem]",
        small: "text-xs",
        medium: "text-sm",
        large: "text-base",
      },
      member: {
        incomplete: "bg-yellow-300 text-yellow-800",
        active: "bg-green-300 text-green-800",
        canceled: "bg-red-300 text-red-800",
        paused: "bg-gray-300 text-gray-800",
        past_due: "bg-orange-300 text-orange-800",
        incomplete_expired: "bg-red-300 text-red-800",
        unpaid: "bg-red-300 text-red-800",
        trialing: "bg-blue-300 text-blue-800",
      },
      roles: {
        red: "bg-red-300  text-red-800",
        green: "bg-green-300 text-green-800",
        blue: "bg-blue-300 text-blue-800",
        pink: "bg-pink-300 text-pink-800",
        cyan: "bg-cyan-300 text-cyan-800",
        lime: "bg-lime-300 text-lime-800",
        orange: "bg-orange-300 text-orange-800",
        fuchsia: "bg-fuchsia-300 text-fuchsia-800",
        sky: "bg-sky-300 text-sky-800",
        lemon: "bg-lime-300 text-lime-800",
        purple: "bg-purple-300 text-purple-800",
        yellow: "bg-yellow-300 text-yellow-800",
      },
      sub: {
        active: "bg-green-300 text-green-800",
        incomplete: "bg-yellow-300 text-yellow-800",
        trialing: "bg-blue-300 text-blue-800",
        past_due: "bg-orange-300 text-orange-800",
        paused: "bg-gray-300 text-gray-800",
        canceled: "bg-red-300 text-red-800",
        unpaid: "bg-red-300 text-red-800",
        incomplete_expired: "bg-red-300 text-red-800",
      },
      inv: {
        unpaid: "bg-red-300 text-red-800",
        paid: "bg-green-300 text-green-800",
        uncollectible: "bg-yellow-300 text-yellow-800",
        draft: "bg-gray-300 text-gray-800",
        void: "bg-red-300 text-red-800",
      },
      pkg: {
        active: "bg-green-300 text-green-800",
        expired: "bg-red-300 text-red-800",
        incomplete: "bg-yellow-300 text-yellow-800",
        completed: "bg-blue-300 text-blue-800",
      },
      transaction: {
        paid: "bg-green-300 text-green-800",
        failed: "bg-red-300 text-red-800",
        incomplete: "bg-yellow-300 text-yellow-800",
      },
      status: {
        open: "bg-indigo-300 text-indigo-800",
        closed: "bg-gray-300 text-gray-800",
        escalated: "bg-orange-300 text-orange-800",
      },
      severity: {
        low: "bg-green-300 text-green-800",
        medium: "bg-yellow-300 text-yellow-800",
        high: "bg-orange-300 text-orange-800",
        urgent: "bg-red-300 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant,
  roles, sub, pkg, transaction,
  status, size, inv, member, severity, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({
      variant, roles, sub, pkg, transaction,
      status, size, inv, member, severity
    }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
