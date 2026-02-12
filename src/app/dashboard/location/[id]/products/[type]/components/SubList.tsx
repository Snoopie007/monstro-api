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
import { MemberPlan, PlanProgram } from "@subtrees/types";
import { useState } from "react";
import { formatAmountForDisplay } from "@/libs/utils";
import PlanActions from "./PlanActions";

interface SubscriptionListProps {
	lid: string;
	archived?: boolean;
}

export function SubscriptionList({ lid, archived = false }: SubscriptionListProps) {
	const { subscriptions, isLoading, error } = useSubscriptions(lid, archived);

	if (error) return <ErrorComponent error={error} />;
	if (isLoading) return <Loading />;

	return (
		<>
			{subscriptions && subscriptions.length > 0 ? (
				<div className="space-y-2">
					{subscriptions.map((sub) => (
						<SubscriptionItem key={sub.id} sub={sub} />
					))}
				</div>
			) : (
				<Empty variant="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleFadingPlusIcon className="size-5" />
						</EmptyMedia>
						<EmptyTitle>No {archived ? 'archived' : 'active'} subscriptions found</EmptyTitle>
						<EmptyDescription>
							{archived 
								? 'Archived subscriptions will appear here'
								: 'Subscriptions will appear here when they are created'
							}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</>
	);
}

export function SubscriptionItem({ sub }: { sub: MemberPlan }) {
	const [open, setOpen] = useState(false);
	const lid = sub.locationId;

	function getInterval(interval: string | null | undefined) {
		if (!interval) return 'N/A';
		return interval === 'month' ? 'monthly' : interval === 'year' ? 'annual' : interval === 'week' ? 'weekly' : 'daily';
	}

	// Get pricing display
	const pricingOptions = sub.pricingOptions || [];
	const getPriceDisplay = () => {
		if (pricingOptions.length === 0) return 'N/A';
		if (pricingOptions.length === 1) {
			return formatAmountForDisplay(pricingOptions[0].price / 100, pricingOptions[0].currency || 'usd');
		}
		// Show range for multiple pricing
		const prices = pricingOptions.map(p => p.price);
		const min = Math.min(...prices);
		const max = Math.max(...prices);
		const currency = pricingOptions[0].currency || 'usd';
		if (min === max) {
			return formatAmountForDisplay(min / 100, currency);
		}
		return `${formatAmountForDisplay(min / 100, currency)} - ${formatAmountForDisplay(max / 100, currency)}`;
	};

	const getCycleDisplay = () => {
		if (pricingOptions.length === 0) return 'N/A';
		// Show first pricing's interval
		return getInterval(pricingOptions[0]?.interval);
	};

	return (
		<div className="flex flex-col gap-2 bg-muted/50 border rounded-lg border-foreground/5 last:border-b-0">
			<div className="flex flex-row gap-4 items-center justify-between p-4">
				<div className="grid grid-cols-6 flex-1 gap-x-4 w-full">
					<InfoField label="Subscription Name" className="col-span-2">
						{sub.name}
					</InfoField>
					<InfoField label="Price" className="col-span-1">
						{getPriceDisplay()}
						{pricingOptions.length > 1 && (
							<span className="text-xs text-muted-foreground ml-1">({pricingOptions.length} options)</span>
						)}
					</InfoField>
					<InfoField label="Cycle" className="col-span-1">
						{getCycleDisplay()}
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
