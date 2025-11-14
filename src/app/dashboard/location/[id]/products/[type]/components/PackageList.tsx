"use client";
import { usePackages } from "@/hooks";
import ErrorComponent from "@/components/error";
import {
  Empty,
  EmptyHeader,
  InfoField,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui";
import Loading from "@/components/loading";
import { CircleFadingPlusIcon, ChevronRight } from "lucide-react";
import { MemberPlan } from "@/types";
import { useState } from "react";
import { formatAmountForDisplay } from "@/libs/utils";
import PlanActions from "./PlanActions";
export function PackageList({ lid }: { lid: string }) {
  const { packages, isLoading, error } = usePackages(lid);


  if (error) return <ErrorComponent error={error} />;
  if (isLoading) return <Loading />;

  return (
    <>
      {packages && packages.length > 0 ? (
        packages.map((pkg) => (
          <PackageItem key={pkg.id} pkg={pkg} />
        ))
      ) : (
        <Empty variant="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleFadingPlusIcon className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No packages found</EmptyTitle>
            <EmptyDescription>Packages will appear here when they are created</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}

export function PackageItem({ pkg }: { pkg: MemberPlan }) {
  const [open, setOpen] = useState(false);
  const lid = pkg.locationId;
  return (
    <div className="flex flex-col gap-2 bg-muted/50 border rounded-lg border-foreground/5 last:border-b-0">
      <div className="flex flex-row gap-4 items-center justify-between p-4">

        <div className="grid grid-cols-6 flex-1 gap-x-4 w-full">
          <InfoField label="Package Name" className="col-span-2">
            {pkg.name}
          </InfoField>
          <InfoField label="Price" className="col-span-1">
            {formatAmountForDisplay(pkg.price, pkg.currency)}
          </InfoField>
          <InfoField label="Family Plan" className="col-span-1 gap-0.5">
            <div className="flex flex-row items-center gap-2">
              {pkg.family ? 'Yes' : 'No'}
            </div>
          </InfoField>
          <InfoField label="Class Limit" className="col-span-1">
            {pkg.totalClassLimit || 0}
          </InfoField>

        </div>
        <div className="flex-shrink-0">
          <PlanActions lid={lid} plan={pkg} />
        </div>
      </div>
      <Collapsible open={open} onOpenChange={setOpen} className="border-t border-foreground/5 group px-4 pt-3 pb-2">
        <CollapsibleTrigger onClick={() => setOpen(!open)}>
          <div className="flex flex-row items-center gap-1">
            <ChevronRight className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-90" />
            <span className="text-sm font-medium">More Details</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="py-4">

        </CollapsibleContent>
      </Collapsible>
    </div >
  );
}