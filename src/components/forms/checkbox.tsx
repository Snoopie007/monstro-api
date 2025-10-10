"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/libs/utils";

import { cva, type VariantProps } from "class-variance-authority";

const checkboxVarients = cva(
  "peer h-4 w-4 shrink-0 rounded-sm border border-foreground ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50  data-[state=checked]:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent data-[state=checked]:bg-primary",
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
        yellow: "bg-yellow-400 data-[state=checked]:bg-yellow-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Checkbox({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & VariantProps<typeof checkboxVarients>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        checkboxVarients({ variant }),
        "peer border-input data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        // Only apply dark mode bg overrides for default variant
        variant === "default" && "dark:bg-input/30 data-[state=checked]:bg-primary dark:data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
