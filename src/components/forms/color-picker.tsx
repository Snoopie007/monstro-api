"use client";

import { Check } from "lucide-react";
import { cn } from "@/libs/utils";
import { getEventColorClasses } from "@/libs/calendar";
import { PROGRAM_COLORS } from "@/libs/program-colors";

interface ProgramColorPickerProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function ProgramColorPicker({
  value = 1,
  onChange,
  disabled = false,
  className,
  name = "program-color",
}: ProgramColorPickerProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
    >
      {PROGRAM_COLORS.map((colorOption) => {
        const isSelected = value === colorOption.id;
        const colorClasses = getEventColorClasses(colorOption.color);

        return (
          <label
            key={colorOption.id}
            className={cn(
              "relative h-10 w-10 rounded-lg transition-all duration-150 cursor-pointer",
              "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
              "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
              colorClasses,
              "hover:scale-110 hover:shadow-md",
              isSelected && [
                "ring-2 ring-offset-2 ring-offset-background",
                "ring-foreground/50 dark:ring-foreground/70",
                "scale-105",
              ]
            )}
          >
            <input
              type="radio"
              name={name}
              value={colorOption.id}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onChange(colorOption.id)}
              className="sr-only"
            />
            {isSelected && (
              <Check
                className="absolute inset-0 m-auto h-5 w-5 stroke-[3]"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">{colorOption.name}</span>
          </label>
        );
      })}
    </div>
  );
}
