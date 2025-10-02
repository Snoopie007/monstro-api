
import { cn } from "@/libs/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { useNewLocation } from "../provider/NewLocationContext";
import React, { useState, useCallback } from "react";
import { MonstroPackage } from "@/types/admin";
import { InfoIcon } from "./InfoIcon";
export default function PackageList() {
    const { locationState, updateLocationState, packages } = useNewLocation();
    const [expandedPackageId, setExpandedPackageId] = useState<number | null>(null);

    const isSelected = useCallback((pkgId: number) => {
        if (!locationState.pkgId) return false;
        return locationState.pkgId === pkgId;
    }, [locationState.pkgId]);

    const isPaymentPlan = useCallback((paymentPlanId: number) => {
        if (!locationState.paymentPlanId) return false;
        return locationState.paymentPlanId === paymentPlanId;
    }, [locationState.paymentPlanId]);

    const isExpanded = useCallback((pkgId: number) => {
        return expandedPackageId === pkgId;
    }, [expandedPackageId]);

    const toggleExpanded = useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pkgId: number) => {
        e.stopPropagation();
        setExpandedPackageId(prevId => prevId === pkgId ? null : pkgId);
    }, []);

    const handlePackageSelect = useCallback((pkgId: number) => {
        updateLocationState({
            ...locationState,
            pkgId: pkgId,
            planId: null
        });
    }, [locationState, updateLocationState]);

    const handlePaymentPlanSelect = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, paymentPlanId: number) => {
        e.stopPropagation();
        updateLocationState({
            ...locationState,
            paymentPlanId: paymentPlanId,
            planId: null
        });
    }, [locationState, updateLocationState]);



    return (
        <div className="flex flex-col gap-2">
            {packages.map((pkg, i) => (
                <div key={pkg.id} onClick={() => handlePackageSelect(pkg.id)} className="group space-y-2"
                    data-selected={isSelected(pkg.id)}
                    data-expanded={isExpanded(pkg.id)}>
                    <PackageInfo
                        pkg={pkg}
                        onExpandClick={toggleExpanded}
                    />
                    <div className="flex-col gap-2 group-data-[selected=true]:flex hidden">
                        <div className="text-sm text-foreground font-semibold">
                            Choose a payment plan
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {pkg.paymentPlans?.map((paymentPlan) => (
                                <div key={paymentPlan.name}
                                    className={cn(
                                        `border border-foreground/10 px-4 py-2 space-y-1 text-sm text-foreground rounded-sm group
                                         hover:border-indigo-500  cursor-pointer`,
                                        isPaymentPlan(paymentPlan.id) && "bg-indigo-500 text-white"
                                    )}
                                    onClick={(e) => handlePaymentPlanSelect(e, paymentPlan.id)}
                                >
                                    <div className=" font-semibold">{paymentPlan.name}</div>
                                    <p className={cn("text-xs text-muted-foreground", isPaymentPlan(paymentPlan.id) && "text-white/80")}>{paymentPlan.description}</p>
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
    onExpandClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pkgId: number) => void;
}

const PackageInfo = React.memo(({ pkg, onExpandClick }: PackageInfoProps) => {
    return (
        <div className={cn(`flex flex-col gap-2 text-foreground cursor-pointer
             hover:border-indigo-500 opacity-70 border border-foreground/10 p-4 rounded-sm
             group-data-[selected=true]:border-indigo-500 group-data-[selected=true]:opacity-100
             hover:opacity-100
            `)} >
            <div className="space-y-3 ">
                <div className="flex flex-row gap-2 items-center justify-between">
                    <h2 className="text-lg font-bold flex flex-row gap-1 items-center">
                        {pkg.name}
                    </h2>
                    <span className="text-sm font-semibold bg-indigo-500 text-white px-2 py-1 rounded-sm">
                        ${pkg.price}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground " dangerouslySetInnerHTML={{ __html: pkg.description }} />
            </div>

            <button
                onClick={(e) => onExpandClick(e, pkg.id)}
                className="text-sm text-indigo-500 hover:text-indigo-600 font-medium text-left cursor-pointer"
            >
                <span className="group-data-[expanded=true]:hidden">See Details</span>
                <span className="group-data-[expanded=false]:hidden">Hide Details</span>
            </button>
            <div className="space-y-2 border-t border-foreground/10 pt-4 group-data-[expanded=true]:block hidden">
                <ul className="flex flex-col gap-4">
                    {pkg.benefits.map((benefit) => (
                        <li key={benefit.name} className="flex flex-row gap-2 text-sm items-center font-medium">
                            <span>{benefit.name}</span>
                            {benefit.description && (
                                <Tooltip>
                                    <TooltipTrigger className="cursor-pointer">
                                        <InfoIcon />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[200px] border-foreground/10 border leading-1 font-normal">
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
