"use client";
import React, { useState } from "react";
import {
	DialogFooter,
	Button,
	DialogClose,
	Popover,
	PopoverTrigger,
	PopoverContent,
	Calendar,
} from "@/components/ui";
import {
	RadioGroup,
	RadioGroupItem,
	Label,
	Textarea,
} from "@/components/forms";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberSubscription } from "@/types/member";
import { cn, tryCatch } from "@/libs/utils";
import { useParams } from "next/navigation";
import { RefundOptions, DayFieldPopover } from ".";

interface CancelSubProps {
	sub: MemberSubscription;
	show: boolean;
	close: () => void;
}

export function CancelSub({ sub, show, close }: CancelSubProps) {
	const params = useParams();
	const [loading, setLoading] = useState(false);

	const [formState, setFormState] = useState({
		cancelOption: "now" as "now" | "end" | "custom",
		customDate: "",
		refundAmount: 0,
		reason: "",
	});

	const handleSubmit = async () => {
		if (!sub?.id || !params?.id || !params?.mid) {
			console.log(sub.id, params.id, params.mid);
			toast.error("Missing required information");
			return;
		}

		if (formState.cancelOption === "custom" && !formState.customDate) {
			toast.error("Please select a cancellation date");
			return;
		}
		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subs/${sub.id}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formState),
			})
		);

		setLoading(false);

		if (error || !result || !result.ok) {
			const errorData = await result?.json();
			toast.error(errorData.error || "Failed to cancel subscription");
			return;
		}

		toast.success("Subscription cancellation processed");
		close();
	};

	return (
		<div className={cn(show ? "block" : "hidden")}>
			<div className="p-4 pt-6 space-y-6">
				<div className="grid grid-cols-4 gap-4">
					<div className="font-medium col-span-1 text-sm">Cancel</div>
					<RadioGroup
						value={formState.cancelOption}
						onValueChange={(value) =>
							setFormState((prev) => ({
								...prev,
								cancelOption: value as "now" | "end" | "custom",
							}))
						}
						className="space-y-2 text-sm col-span-3"
					>
						<div className="flex flex-row items-start gap-3">
							<RadioGroupItem value="now" id="now" />

							<div className="space-y-0">
								<Label htmlFor="now" className="text-sm cursor-pointer">
									Immediately
								</Label>
								<div className="text-xs text-muted-foreground">
									{format(new Date(), "MMM d, yyyy")}
								</div>
							</div>
						</div>

						<div className="flex flex-row items-start gap-3">
							<RadioGroupItem value="end" id="end" />

							<div className="space-y-0">
								<Label htmlFor="end" className="text-sm cursor-pointer">
									End of current period
								</Label>
								<div className="text-xs text-muted-foreground">
									{format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
								</div>
							</div>
						</div>

						<div className="flex flex-row items-start gap-3">
							<RadioGroupItem value="custom" id="custom" />

							<div className="w-full flex flex-col gap-1">
								<Label htmlFor="custom" className="text-sm cursor-pointer">
									On custom date
								</Label>
								{formState.cancelOption === "custom" && (
									<DayFieldPopover
										value={formState.customDate}
										onChange={(date) =>
											setFormState((prev) => ({
												...prev,
												customDate: date || "",
											}))
										}
									/>
								)}
							</div>
						</div>
					</RadioGroup>
				</div>

				{sub.stripeSubscriptionId && (
					<RefundOptions
						onChange={(value) => {
							setFormState((prev) => ({
								...prev,
								refundAmount: value,
							}));
						}}
						amount={sub.plan?.price || 0}
					/>
				)}

				<div className="grid grid-cols-4 gap-4">
					<Label className="text-sm col-span-1">Reason</Label>
					<Textarea
						id="reason"
						value={formState.reason}
						className="border-foreground/10 col-span-3 resize-none"
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, reason: e.target.value }))
						}
						placeholder="Help us improve by sharing your reason for cancellation"
						rows={3}
					/>
				</div>
			</div>

			<DialogFooter className="bg-transparent sm:justify-between">
				<DialogClose asChild>
					<Button
						variant="foreground"
						size="sm"
						className="border-foreground/10"
						disabled={loading}
					>
						Don't cancel
					</Button>
				</DialogClose>
				<Button
					variant="continue"
					size="sm"
					onClick={handleSubmit}
					disabled={loading}
				>
					{loading ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						"Cancel"
					)}
				</Button>
			</DialogFooter>
		</div>
	);
}
