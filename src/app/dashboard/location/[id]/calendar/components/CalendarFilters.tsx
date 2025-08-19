"use client";
import { useMemberPlans } from "@/hooks/usePlans";
import { MemberPlan } from "@/types/member";
import { Loader2 } from "lucide-react";
import { PlanCheckbox } from "./PlanItemCheckbox";
import { Checkbox } from "@/components/forms";
import { Skeleton } from "@/components/ui";
import { useMemo } from "react";

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

  if (error) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Failed to load plans
      </div>
    );
  }

  const allSelected = useMemo(() => {
    if (!plans) return false;
    return selectedPlanIds.length === plans.length;
  }, [selectedPlanIds, plans]);

  const someSelected = useMemo(() => {
    if (!plans) return false;
    return selectedPlanIds.length > 0 && selectedPlanIds.length < plans.length;
  }, [selectedPlanIds, plans]);

  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4 space-y-4">

      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ) : (
        plans && plans.length > 0 ? (
          <>
            <div className="flex items-center space-x-2  pb-2 border-b border-foreground/10">
              <div className="flex items-center justify-center">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className={`${someSelected ? "data-[state=checked]:bg-orange-500" : ""
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

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {plans.map((plan: MemberPlan) => (
                <PlanCheckbox key={plan.id} plan={plan} isSelected={selectedPlanIds.includes(plan.id)} onToggle={handlePlanToggle} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No plans available
          </div>
        )
      )}


      <div className=" border-t border-foreground/10 text-sm text-muted-foreground pt-2">
        {selectedPlanIds.length || 0} of {plans ? plans.length : 0} plans selected
      </div>
    </div>
  );
}
