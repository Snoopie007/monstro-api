
import { cn } from "@/libs/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { useNewLocation } from "../provider/NewLocationContext";
import { useState } from "react";
import { MonstroPlan } from "@/types/admin";
import { InfoIcon } from "./InfoIcon";



export default function PlanList() {
    const { locationState, updateLocationState, plans } = useNewLocation();
    const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

    function isSelected(plan: MonstroPlan) {
        return locationState.planId === plan.id;
    }

    function toggleExpanded(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, plan: MonstroPlan) {
        e.stopPropagation();
        setExpandedPlanId(isExpanded(plan) ? null : plan.id);
    }

    const handlePlanSelect = (plan: MonstroPlan) => {
        updateLocationState({
            ...locationState,
            planId: plan.id
        });
        setExpandedPlanId(plan.id);
    };

    function isExpanded(plan: MonstroPlan) {
        return expandedPlanId === plan.id;
    }

    return (
        <div className="flex flex-col gap-2">
            {plans.map((plan, i) => (
                <div key={i} onClick={() => handlePlanSelect(plan)} data-selected={isSelected(plan)}
                    data-expanded={isExpanded(plan)}
                    className={cn(
                        "flex flex-col gap-2 text-foreground group cursor-pointer opacity-70",
                        " hover:border-indigo-500 border border-foreground/10 p-4 rounded-lg",
                        "data-[selected=true]:border-indigo-500 data-[selected=true]:opacity-100",

                    )}
                >
                    <div className="space-y-3">
                        <div className="flex flex-row  items-center justify-between">
                            <h2 className="text-lg font-bold flex flex-row gap-1 items-center">
                                {plan.name}
                            </h2>
                            <span className="text-sm font-semibold bg-indigo-500 text-white px-2 py-1 rounded-sm">
                                ${plan.price}{plan.id !== 1 && `/${plan.threshold} ${plan.interval}`}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: plan.description }} />
                    </div>

                    <button
                        onClick={(e) => toggleExpanded(e, plan)}
                        className="text-sm text-indigo-500 hover:text-indigo-600 font-medium text-left cursor-pointer"
                    >
                        <span className="group-data-[expanded=true]:hidden">See Details</span>
                        <span className="group-data-[expanded=false]:hidden">Hide Details</span>
                    </button>

                    <div className="space-y-4 border-t border-foreground/10 pt-4 group-data-[expanded=true]:block hidden">
                        <ul className="text-sm grid grid-cols-2 gap-4">
                            {plan.benefits.map((benefit, index) => (
                                <li key={index} className="flex flex-row gap-2 items-center font-medium">
                                    <span>{benefit.name}</span>
                                    {benefit.description && (
                                        <Tooltip>
                                            <TooltipTrigger className="cursor-pointer">
                                                <InfoIcon />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] border-foreground/10 border">
                                                <span className="text-xs">{benefit.description}</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {plan.note && (
                            <p className="text-sm  items-start">
                                <span className="text-red-500">*</span>
                                <span className=" text-muted-foreground">{" "}
                                    Stripe transaction fees (2.9% + $0.30) apply.
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

