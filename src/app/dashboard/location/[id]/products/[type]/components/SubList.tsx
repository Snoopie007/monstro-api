"use client";
import { useSubscriptions } from "@/hooks";
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
import { Badge } from "@/components/ui/badge";
import Loading from "@/components/loading";
import { CircleFadingPlusIcon, ChevronRight } from "lucide-react";
import { MemberPlan, PlanProgram } from "@/types";
import { useState } from "react";
import { formatAmountForDisplay } from "@/libs/utils";
import PlanActions from "./PlanActions";
export function SubscriptionList({ lid }: { lid: string }) {
	const { subscriptions, isLoading, error } = useSubscriptions(lid);

	if (error) return <ErrorComponent error={error} />;
	if (isLoading) return <Loading />;

	return (
		<>
			{subscriptions && subscriptions.length > 0 ? (
				subscriptions.map((sub) => (
					<SubscriptionItem key={sub.id} sub={sub} />
				))
			) : (
				<Empty variant="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleFadingPlusIcon className="size-5" />
						</EmptyMedia>
						<EmptyTitle>No subscriptions found</EmptyTitle>
						<EmptyDescription>Subscriptions will appear here when they are created</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</>
	);
}

export function SubscriptionItem({ sub }: { sub: MemberPlan }) {
	const [open, setOpen] = useState(false);
	const lid = sub.locationId;

	function getInterval(interval: string | null) {
		if (!interval) return 'N/A';
		return interval === 'month' ? 'monthly' : interval === 'year' ? 'annual' : interval === 'week' ? 'weekly' : 'daily';
	}
	return (
		<div className="flex flex-col gap-2 bg-muted/50 border rounded-lg border-foreground/5 last:border-b-0">
			<div className="flex flex-row gap-4 items-center justify-between p-4">
				<div className="grid grid-cols-6 flex-1 gap-x-4 w-full">
					<InfoField label="Subscription Name" className="col-span-2">
						{sub.name}
					</InfoField>
					<InfoField label="Price" className="col-span-1">
						{formatAmountForDisplay(sub.price / 100, sub.currency)}
					</InfoField>
					<InfoField label="Cycle" className="col-span-1">
						{getInterval(sub.interval)}
					</InfoField>
					<InfoField label="Family Plan" className="col-span-1 gap-0.5">
						<div className="flex flex-row items-center gap-2">
							<Badge
								variant={sub.family ? 'default' : 'secondary'}

								className="rounded-sm"
							>
								{sub.family ? 'Yes' : 'No'}
							</Badge>
						</div>
					</InfoField>

				</div>
				<div className="flex-shrink-0">
					<PlanActions lid={lid} plan={sub} />
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
					<div className="grid grid-cols-3 gap-4">
						{sub.family && (
							<InfoField label="Family Member Limit">
								{sub.familyMemberLimit || 'Unlimited'}
							</InfoField>
						)}
						<InfoField label="Total Class Limit">
							{sub.totalClassLimit || 'Unlimited'}
						</InfoField>
						<InfoField label="Programs" className="col-span-1">
							<div className="flex flex-wrap gap-1">
								{sub.planPrograms && sub.planPrograms.length > 0 ? (
									<>
										{sub.planPrograms
											.slice(0, 2)
											.map((planProgram: PlanProgram) => (
												<Badge
													key={planProgram.program?.id}
													variant="default"
												>
													{planProgram.program?.name}
												</Badge>
											))}
										{sub.planPrograms.length > 2 && (
											<span className="text-xs text-muted-foreground">+{sub.planPrograms.length - 2}</span>
										)}
									</>
								) : (
									<span className="text-xs text-muted-foreground">None</span>
								)}
							</div>
						</InfoField>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
