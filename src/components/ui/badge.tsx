import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/libs/utils"

const badgeVariants = cva(
  "inline-flex items-center  px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      roles: {
        default:
          "border-transparent bg-primary text-primary-foreground ",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground ",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
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
    },
    defaultVariants: {
      roles: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, roles, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ roles }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
