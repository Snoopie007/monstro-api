'use client'
import { NumericFormat } from "react-number-format";
import { cn } from "@/libs/utils";

import {
    ButtonGroup,
    ButtonGroupText,
} from "../ui";
import { Label } from "./label";


interface PriceInputProps {
    value: number | undefined | null
    onChange: (value: number) => void
    size?: "default" | "lg"
}
export function PriceInput({ value, onChange, size = "default" }: PriceInputProps) {
    // Convert from cents to dollars for display
    const displayValue = value != null ? value / 100 : 0;

    return (
        <ButtonGroup className="w-full">
            <ButtonGroupText asChild>
                <Label className={cn(
                    "bg-foreground/5 border-foreground/5",
                    size === "lg" && "h-12 flex items-center"
                )}>$</Label>
            </ButtonGroupText>
            <NumericFormat
                className={cn(
                    "flex w-full rounded-r-md border border-l-0 border-input dark:border-accent-foreground/10 bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    size === "default" && "h-9",
                    size === "lg" && "h-12 rounded-lg"
                )}
                value={displayValue}
                decimalScale={2}
                fixedDecimalScale={true}
                thousandSeparator={true}
                placeholder="0.00"
                onValueChange={(values) => {
                    // Convert from dollars to cents for storage
                    const cents = values.floatValue != null
                        ? Math.round(values.floatValue * 100)
                        : 0;
                    onChange(cents);
                }}
            />
        </ButtonGroup>
    )
}
