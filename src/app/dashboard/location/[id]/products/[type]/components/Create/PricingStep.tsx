"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/libs/utils";
import { toast } from "react-toastify";
import CurrencyInput from "react-currency-input-field";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/forms";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { HelpCircle } from "lucide-react";

interface PricingOption {
  id?: string;
  name: string;
  price: number;
  interval?: "day" | "week" | "month" | "year";
  intervalThreshold: number;
  expireInterval: "day" | "week" | "month" | "year" | null;
  expireThreshold: number | null;
  downpayment?: number;
}

interface PricingStepProps {
  planId: string;
  locationId: string;
  type: "subs" | "pkgs";
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PricingStep({
  planId,
  locationId,
  type,
  onSuccess,
  onError,
}: PricingStepProps) {
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([
    {
      name: "Standard",
      price: 0,
      interval: type === "subs" ? "month" : undefined,
      intervalThreshold: 1,
      expireInterval: null,
      expireThreshold: null,
      downpayment: type === "subs" ? 0 : undefined,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const planType = type === "subs" ? "recurring" : "one-time";

  const addPricingOption = () => {
    setPricingOptions((prev) => [
      ...prev,
      {
        name: `Option ${prev.length + 1}`,
        price: 0,
        interval: type === "subs" ? "month" : undefined,
        intervalThreshold: 1,
        expireInterval: null,
        expireThreshold: null,
        downpayment: type === "subs" ? 0 : undefined,
      },
    ]);
  };

  const removePricingOption = (index: number) => {
    setPricingOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePricingOption = (
    index: number,
    field: keyof PricingOption,
    value: unknown
  ) => {
    setPricingOptions((prev) =>
      prev.map((option, i) => (i === index ? { ...option, [field]: value } : option))
    );
  };

  const validatePricing = (): boolean => {
    if (pricingOptions.length === 0) {
      onError("At least one pricing option is required");
      return false;
    }

    for (const option of pricingOptions) {
      if (!option.name || option.name.trim() === "") {
        onError("Pricing option name is required");
        return false;
      }
      if (option.price < 100) {
        onError("Price must be at least $1");
        return false;
      }
      if (type === "subs" && !option.interval) {
        onError("Billing interval is required for subscriptions");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validatePricing()) {
      return;
    }

    setIsSubmitting(true);
    try {
      for (const option of pricingOptions) {
        const response = await fetch(
          `/api/protected/loc/${locationId}/plans/${type}/pricing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberPlanId: planId,
              name: option.name,
              price: option.price,
              currency: "USD",
              interval: option.interval,
              intervalThreshold: option.intervalThreshold,
              expireInterval: option.expireInterval,
              expireThreshold: option.expireThreshold,
              downpayment: option.downpayment,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create pricing");
        }
      }

      toast.success("Pricing options saved successfully");
      onSuccess();
    } catch (error) {
      console.error("Error saving pricing:", error);
      onError(
        error instanceof Error ? error.message : "Failed to save pricing options"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Pricing Options</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addPricingOption}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          Add Pricing
        </Button>
      </div>

      {pricingOptions.length === 0 && (
        <div className="border border-dashed border-foreground/20 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No pricing options yet. Add at least one pricing option.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPricingOption}
            className="mt-2"
          >
            <Plus className="size-3 mr-1" />
            Add Pricing Option
          </Button>
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
        {pricingOptions.map((option, index) => (
          <div
            key={`pricing-option-${index}-${option.name}`}
            className="border border-foreground/10 rounded-lg p-3 space-y-3 relative bg-background/50"
          >
            {pricingOptions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePricingOption(index)}
                className="absolute top-2 right-2 h-6 w-6 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Name</label>
                <Input
                  placeholder="e.g., Monthly, 6-Month"
                  value={option.name}
                  onChange={(e) =>
                    updatePricingOption(index, "name", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Price</label>
                <CurrencyInput
                  className={cn(
                    "inline-block w-full h-12 rounded-lg bg-background border border-foreground/10 px-4"
                  )}
                  value={option.price ? option.price / 100 : 0}
                  onValueChange={(value) => {
                    const price = value ? Math.round(Number(value) * 100) : 0;
                    updatePricingOption(index, "price", price);
                  }}
                  decimalsLimit={2}
                  allowNegativeValue={false}
                />
              </div>
            </div>

            {planType === "recurring" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Billing Interval</label>
                  <Select
                    value={option.interval || "month"}
                    onValueChange={(value) =>
                      updatePricingOption(
                        index,
                        "interval",
                        value as "day" | "week" | "month" | "year"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["day", "week", "month", "year"].map((interval) => (
                        <SelectItem key={interval} value={interval}>
                          {interval.charAt(0).toUpperCase() + interval.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Every</label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    value={option.intervalThreshold}
                    onChange={(e) =>
                      updatePricingOption(
                        index,
                        "intervalThreshold",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "grid gap-2",
                planType === "recurring" ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              {planType === "recurring" && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium">Downpayment</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <HelpCircle className="size-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Optional upfront payment collected when the member
                            signs up for this plan.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CurrencyInput
                    className={cn(
                      "inline-block w-full h-12 rounded-lg bg-background border border-foreground/10 px-4"
                    )}
                    value={option.downpayment ? option.downpayment / 100 : 0}
                    onValueChange={(value) => {
                      const downpayment = value
                        ? Math.round(Number(value) * 100)
                        : 0;
                      updatePricingOption(index, "downpayment", downpayment);
                    }}
                    allowNegativeValue={false}
                    decimalsLimit={2}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium">Term Interval</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <HelpCircle className="size-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          How long until the plan auto-cancels or expires.
                          Leave empty for ongoing subscriptions or packages
                          that never expire.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={option.expireInterval || "none"}
                  onValueChange={(value) =>
                    updatePricingOption(
                      index,
                      "expireInterval",
                      value === "none" ? null : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No expiration</SelectItem>
                    <SelectItem value="day">Days</SelectItem>
                    <SelectItem value="week">Weeks</SelectItem>
                    <SelectItem value="month">Months</SelectItem>
                    <SelectItem value="year">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {option.expireInterval && (
              <div
                className={cn(
                  "grid gap-2",
                  planType === "recurring" ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                {planType === "recurring" && <div />}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Term Length</label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g., 6"
                    value={option.expireThreshold || ""}
                    onChange={(e) =>
                      updatePricingOption(
                        index,
                        "expireThreshold",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleSubmit}
          variant="primary"
          disabled={isSubmitting || pricingOptions.length === 0}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Plan"
          )}
        </Button>
      </div>
    </div>
  );
}
