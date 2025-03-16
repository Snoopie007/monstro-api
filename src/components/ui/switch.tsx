"use client"
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"


const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-input",
  {
    variants: {
      size: {
        default: "h-[19px] w-[38px]",
        sm: "h-[15px] w-[30px]",
        lg: "h-[24px] w-[48px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:bg-white",
  {
    variants: {
      size: {
        default: "h-[15px] w-[15px] data-[state=checked]:translate-x-[19px] data-[state=unchecked]:translate-x-0",
        sm: "h-[11px] w-[11px] data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0",
        lg: "h-[20px] w-[20px] data-[state=checked]:translate-x-[24px] data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)


export interface SwitchProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof switchVariants> {
  asChild?: boolean
}


const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={switchVariants({ size, className })}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={switchThumbVariants({ size })}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
