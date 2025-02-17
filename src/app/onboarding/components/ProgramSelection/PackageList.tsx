import { packages, MonstroPackage, PackagePaymentPlan } from "./dummy";
import { cn } from "@/libs/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { useOnboarding } from "../../provider/OnboardingProvider";
import React, { useState, useMemo, useCallback } from "react";

export default function PackageList() {
    const { progress, updateProgress } = useOnboarding();
    const [expandedPackageId, setExpandedPackageId] = useState<number | null>(null);

    const isSelected = useCallback((pkg: MonstroPackage) => {
        if (!progress.pkg) return false;
        return progress.pkg.id === pkg.id;
    }, [progress.pkg]);

    const isPaymentPlan = useCallback((paymentPlan: PackagePaymentPlan) => {
        if (!progress.paymentPlan) return false;
        return progress.paymentPlan.name === paymentPlan.name;
    }, [progress.paymentPlan]);

    const isExpanded = useCallback((pkg: MonstroPackage) => {
        return expandedPackageId === pkg.id;
    }, [expandedPackageId]);

    const toggleExpanded = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pkg: MonstroPackage) => {
        e.stopPropagation();
        setExpandedPackageId(prevId => prevId === pkg.id ? null : pkg.id);
    }, []);

    const handlePackageSelect = useCallback((pkg: MonstroPackage) => {
        updateProgress({
            ...progress,
            pkg,
            plan: null
        });
    }, [progress, updateProgress]);

    const handlePaymentPlanSelect = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, paymentPlan: PackagePaymentPlan) => {
        e.stopPropagation();
        updateProgress({
            ...progress,
            paymentPlan,
            plan: null
        });
    }, [progress, updateProgress]);

    const InfoIcon = useMemo(() => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
            <circle cx="12" cy="12" r="10" className="fill-indigo-500 stroke-0" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" className="text-white" />
            <path d="M12 17h.01" className="text-white" />
        </svg>
    ), []);

    return (
        <div className="flex flex-col gap-2">
            {packages.map((pkg, i) => (
                <div key={pkg.id} onClick={() => handlePackageSelect(pkg)} className="group space-y-2" data-selected={isSelected(pkg)} data-expanded={isExpanded(pkg)}>
                    <PackageInfo
                        pkg={pkg}
                        onExpandClick={toggleExpanded}
                        InfoIcon={InfoIcon}
                    />
                    <div className="flex-col gap-2 group-data-[selected=true]:flex hidden">
                        <div className="text-sm text-foreground font-semibold">
                            Select a payment plan
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {pkg.paymentPlans.map((paymentPlan) => (
                                <div key={paymentPlan.name}
                                    className={cn(
                                        `border border-foreground/10 px-4 py-2 space-y-1 text-sm text-foreground rounded-xs hover:bg-indigo-500 cursor-pointer`,
                                        isPaymentPlan(paymentPlan) && "bg-indigo-500 text-white"
                                    )}
                                    onClick={(e) => handlePaymentPlanSelect(e, paymentPlan)}
                                >
                                    <div className="text-sm font-semibold">{paymentPlan.name}</div>
                                    <p className="text-xs text-foreground/60">{paymentPlan.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface PackageInfoProps {
    pkg: MonstroPackage;
    onExpandClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pkg: MonstroPackage) => void;
    InfoIcon: React.ReactNode;
}

const PackageInfo = React.memo(({ pkg, onExpandClick, InfoIcon }: PackageInfoProps) => {
    return (
        <div className={cn(`flex flex-col gap-2 text-foreground cursor-pointer
             hover:border-indigo-500 opacity-50 border border-foreground/10 p-4 rounded-sm
             group-data-[selected=true]:border-indigo-500 group-data-[selected=true]:opacity-100
             hover:opacity-100
            `)} >
            <div className="space-y-3 group-data-[selected=true]:space-y-0">
                <div className="flex flex-row gap-2 items-center justify-between">
                    <h2 className="text-base font-bold flex flex-row gap-1 items-center">
                        {pkg.name}
                    </h2>
                    <span className="text-xs font-semibold bg-indigo-500 text-white px-2 py-1 rounded-sm">${pkg.price}</span>
                </div>
                <p className="text-sm text-foreground/60 group-data-[selected=true]:hidden" dangerouslySetInnerHTML={{ __html: pkg.description }} />
            </div>

            <button
                onClick={(e) => onExpandClick(e, pkg)}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-medium text-left"
            >
                <span className="group-data-[expanded=true]:hidden">See Details</span>
                <span className="group-data-[expanded=false]:hidden">Hide Details</span>
            </button>
            <div className="space-y-2 border-t border-foreground/10 pt-4 group-data-[expanded=true]:block hidden">
                <ul className="text-sm grid grid-cols-2 gap-2">
                    {pkg.benefits.map((benefit) => (
                        <li key={benefit.name} className="flex flex-row gap-2 text-sm items-center font-semibold">
                            <span>{benefit.name}</span>
                            {benefit.description && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        {InfoIcon}
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] border-foreground/10 border">
                                        <span className="text-xs">{benefit.description}</span>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
});

PackageInfo.displayName = 'PackageInfo';
