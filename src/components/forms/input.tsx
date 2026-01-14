import * as React from "react"

import { cn } from "@/libs/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  "flex h-12 w-full rounded-lg text-sm border border-foreground/10 p-3 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-background",
        register: "border-indigo-600 border-2 text-black text-sm focus-visible:ring-0 focus-visible:outline-hidden py-3 h-auto rounded-sm  shadow-unique bg-white",
        search: "border h-8 border-foreground/10 rounded-md w-auto"
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {

}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
