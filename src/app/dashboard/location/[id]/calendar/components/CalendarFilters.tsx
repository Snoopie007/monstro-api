"use client";

import { useState } from "react";
import { Checkbox } from "@/components/forms/checkbox";
import { useMemberPlans } from "@/hooks/usePlans";
import { MemberPlan } from "@/types/member";
import { Loader2, Filter } from "lucide-react";

interface CalendarFiltersProps {
  locationId: string;
  selectedPlanIds: string[];
  onFilterChange: (planIds: string[]) => void;
}

export function CalendarFilters({
  locationId,
  selectedPlanIds,
  onFilterChange,
}: CalendarFiltersProps) {
  const { plans, isLoading, error } = useMemberPlans(locationId);

  const handlePlanToggle = (planId: string, checked: boolean) => {
    if (checked) {
      onFilterChange([...selectedPlanIds, planId]);
    } else {
      onFilterChange(selectedPlanIds.filter((id) => id !== planId));
    }
  };

  const handleSelectAll = () => {
    if (plans && selectedPlanIds.length === plans.length) {
      // If all are selected, deselect all
      onFilterChange([]);
    } else {
      // Otherwise, select all
      onFilterChange(plans?.map((plan: MemberPlan) => plan.id) || []);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-foreground/10 bg-background p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="text-sm font-medium">Filter by Plans</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-foreground/10 bg-background p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="text-sm font-medium">Filter by Plans</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          Failed to load plans
        </div>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="rounded-lg border border-foreground/10 bg-background p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="text-sm font-medium">Filter by Plans</h3>
        </div>
        <div className="text-sm text-muted-foreground">No plans available</div>
      </div>
    );
  }

  const allSelected = selectedPlanIds.length === plans.length;
  const someSelected =
    selectedPlanIds.length > 0 && selectedPlanIds.length < plans.length;

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-4 w-4" />
        <h3 className="text-sm font-medium">Filter by Plans</h3>
      </div>

      {/* Select All Option */}
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-foreground/10">
        <div className="flex items-center justify-center">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className={`${
              someSelected ? "data-[state=checked]:bg-orange-500" : ""
            }`}
          />
        </div>
        <label
          htmlFor="select-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {allSelected
            ? "Deselect All"
            : someSelected
            ? "Select All"
            : "Select All"}
        </label>
        {someSelected && (
          <span className="text-xs text-muted-foreground">
            ({selectedPlanIds.length}/{plans.length})
          </span>
        )}
      </div>

      {/* Individual Plan Checkboxes */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {plans.map((plan: MemberPlan) => (
          <div key={plan.id} className="flex items-start space-x-2">
            <div className="flex items-center justify-center mt-0.5">
              <Checkbox
                id={`plan-${plan.id}`}
                checked={selectedPlanIds.includes(plan.id)}
                onCheckedChange={(checked) =>
                  handlePlanToggle(plan.id, checked as boolean)
                }
                className="data-[state=checked]:bg-foreground/50"
              />
            </div>
            <label
              htmlFor={`plan-${plan.id}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
            >
              <div className="flex flex-col">
                <span className="font-medium">{plan.name}</span>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span className="capitalize">{plan.type}</span>
                  <span>•</span>
                  <span>
                    ${(plan.price / 100).toFixed(2)}
                    {plan.type === "recurring" && (
                      <>
                        /
                        {plan.intervalThreshold && plan.intervalThreshold > 1
                          ? `${plan.intervalThreshold} `
                          : ""}
                        {plan.interval}
                        {plan.intervalThreshold &&
                        plan.intervalThreshold > 1 &&
                        plan.interval !== "day"
                          ? "s"
                          : ""}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </label>
          </div>
        ))}
      </div>

      {/* Summary */}
      {selectedPlanIds.length > 0 && (
        <div className="mt-3 pt-2 border-t border-foreground/10">
          <div className="text-xs text-muted-foreground">
            {selectedPlanIds.length} of {plans.length} plans selected
          </div>
        </div>
      )}
    </div>
  );
}
