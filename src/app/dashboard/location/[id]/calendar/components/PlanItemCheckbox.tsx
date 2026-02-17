import { Checkbox } from "@/components/forms/checkbox";
import { MemberPlan } from "@subtrees/types/member";

interface PlanCheckboxProps {
    plan: MemberPlan;
    isSelected: boolean;
    onToggle: (planId: string, checked: boolean) => void;
}


export function PlanCheckbox({ plan, isSelected, onToggle }: PlanCheckboxProps) {
    // Get the first pricing option for display
    const pricing = plan.pricings?.[0];
    const price = pricing?.price ?? 0;
    const interval = pricing?.interval;
    const intervalThreshold = pricing?.intervalThreshold;

    return (
        <div key={plan.id} className="flex items-start space-x-2">
            <div className="flex items-center justify-center mt-0.5">
                <Checkbox
                    id={`plan-${plan.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                        onToggle(plan.id, checked as boolean)
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
                            ${(price / 100).toFixed(2)}
                            {plan.type === "recurring" && interval && (
                                <>
                                    /
                                    {intervalThreshold && intervalThreshold > 1
                                        ? `${intervalThreshold} `
                                        : ""}
                                    {interval}
                                    {intervalThreshold &&
                                        intervalThreshold > 1 &&
                                        interval !== "day"
                                        ? "s"
                                        : ""}
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </label>
        </div>
    );
}
