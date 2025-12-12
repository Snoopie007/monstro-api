"use client";

import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import type { CustomFieldDefinition } from "@/types";

interface CustomFieldDisplayProps {
  field: CustomFieldDefinition;
  value: string;
  showLabel?: boolean;
  variant?: "default" | "compact" | "inline";
}

export function CustomFieldDisplay({
  field,
  value,
  showLabel = true,
  variant = "default",
}: CustomFieldDisplayProps) {
  const renderValue = () => {
    if (!value) {
      return (
        <span className="text-muted-foreground text-sm italic">
          Not provided
        </span>
      );
    }

    switch (field.type) {
      case "text":
      case "number":
        return <span className="text-sm">{value}</span>;

      case "date":
        try {
          const date = new Date(value);
          return <span className="text-sm">{format(date, "PPP")}</span>;
        } catch {
          return <span className="text-sm">{value}</span>;
        }

      case "boolean":
        const booleanValue = value === "true";
        return (
          <div className="flex items-center gap-1">
            {booleanValue ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">{booleanValue ? "Yes" : "No"}</span>
          </div>
        );

      case "select":
        const selectedOption = field.options?.find(
          (opt) => opt.value === value
        );
        return (
          // <Badge variant="secondary" className="text-xs">
          //   {selectedOption?.label || value}
          // </Badge>
          <span className="text-sm w-full">{selectedOption?.label || value}</span>
        );

      case "multi-select":
        const selectedValues = value.split(",").filter(Boolean);
        if (selectedValues.length === 0) {
          return (
            <span className="text-muted-foreground text-sm italic">
              None selected
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((val) => {
              const option = field.options?.find((opt) => opt.value === val);
              return (
                <Badge key={val} variant="outline" className="text-xs">
                  {option?.label || val}
                </Badge>
              );
            })}
          </div>
        );

      default:
        return <span className="text-sm">{value}</span>;
    }
  };

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1">
        {showLabel && (
          <span className="text-xs text-muted-foreground font-medium">
            {field.name}:
          </span>
        )}
        {renderValue()}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between py-1">
        {showLabel && (
          <span className="text-sm text-muted-foreground font-medium">
            {field.name}
          </span>
        )}
        <div className="text-right">{renderValue()}</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {showLabel && (
        <label className="text-sm font-medium text-foreground">
          {field.name}
        </label>
      )}
      <div className="min-h-[24px] flex items-start">{renderValue()}</div>
      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}
