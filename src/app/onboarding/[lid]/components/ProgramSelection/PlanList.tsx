import { plans } from "@/libs/data";
import { cn } from "@/libs/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { useOnboarding } from "../../provider/OnboardingProvider";
import { useState } from "react";
import { MonstroPlan } from "@/types";

export default function PlanList() {
    const { locationState, updateLocationState } = useOnboarding();
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
                <div key={i} onClick={() => handlePlanSelect(plan)} data-selected={isSelected(plan)} data-expanded={isExpanded(plan)}
                    className={cn(
                        "flex flex-col gap-2 text-black group cursor-pointer",
                        " hover:border-indigo-500 border border-gray-200  shadow-xs p-4 rounded-sm",
                        "data-[selected=true]:border-indigo-500 ",

                    )}
                >
                    <div className="space-y-4">
                        <div className="flex flex-row  items-center justify-between">
                            <h2 className="text-base font-bold flex flex-row gap-1 items-center">
                                {plan.name}
                            </h2>
                            <span className="text-xs font-semibold bg-indigo-500 text-white px-2 py-1 rounded-sm">
                                ${plan.price}/{plan.interval}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: plan.description }} />
                    </div>

                    <button
                        onClick={(e) => toggleExpanded(e, plan)}
                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium text-left cursor-pointer"
                    >
                        <span className="group-data-[expanded=true]:hidden">See Details</span>
                        <span className="group-data-[expanded=false]:hidden">Hide Details</span>
                    </button>

                    <div className="space-y-2 border-t border-foreground/10 pt-4 group-data-[expanded=true]:block hidden">
                        <ul className="text-sm grid grid-cols-2 gap-2">
                            {plan.benefits.map((benefit, index) => (
                                <li key={index} className="flex flex-row gap-2 text-sm items-center font-medium">
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
                            <p className="text-xs  flex flex-row gap-0.5 items-center">
                                <span className="text-red-500 pt-0.5">*</span>
                                <span className="italic text-gray-600">{plan.note}</span>
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function InfoIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
            <circle cx="12" cy="12" r="10" className="fill-indigo-500 stroke-0" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" className="text-white" />
            <path d="M12 17h.01" className="text-white" />
        </svg>
    )
}
