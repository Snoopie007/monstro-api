"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/libs/utils"
import { cva, type VariantProps } from "class-variance-authority"



const checkboxVarients = cva(
	"peer h-4 w-4 shrink-0 rounded-sm border border-foreground ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50  data-[state=checked]:text-primary-foreground",
	{
		variants: {
			variant: {
				default: "bg-transparent  data-[state=checked]:bg-primary",
				red: "bg-red-500 data-[state=checked]:bg-red-500",
				green: "bg-green-400 data-[state=checked]:bg-green-400",
				blue: "bg-blue-500 data-[state=checked]:bg-blue-500",
				pink: "bg-pink-500 data-[state=checked]:bg-pink-500",
				cyan: "bg-cyan-400 data-[state=checked]:bg-cyan-400",
				lime: "bg-lime-400 data-[state=checked]:bg-lime-400",
				orange: "bg-orange-500 data-[state=checked]:bg-orange-500",
				fuchsia: "bg-fuchsia-500 data-[state=checked]:bg-fuchsia-500",
				sky: "bg-sky-400 data-[state=checked]:bg-sky-400",
				lemon: "bg-lime-500 data-[state=checked]:bg-lime-500",
				purple: "bg-purple-500 data-[state=checked]:bg-purple-500",
				yellow: "bg-yellow-400 data-[state=checked]:bg-yellow-400"
			}
		},
		defaultVariants: {
			variant: "default",
		},
	}
)
interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, VariantProps<typeof checkboxVarients> { }
const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	CheckboxProps
>(({ variant, className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(checkboxVarients({ variant, className })
		)}
		{...props}
	>
		<CheckboxPrimitive.Indicator
			className={cn("relative text-current")}
		>
			<Check size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={2} />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root >
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox, checkboxVarients }
