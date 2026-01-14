"use client";
import React, { useState } from "react";
import {
	DialogFooter,
	Button,
	DialogClose,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
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
import { RefundOptions } from "./RefundOptions";
import { DayFieldPopover } from "./DayFieldPopover";

interface CancelSubProps {
	sub: MemberSubscription;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CancelSub({ sub, open, onOpenChange }: CancelSubProps) {
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
		const path = sub.paymentType === "card" ? "subs" : "subs/cash";
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/${path}/${sub.id}`, {
				method: sub.paymentType === "card" ? "DELETE" : "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formState),
			})
		);



		if (error || !result || !result.ok) {
			setLoading(false);
			const errorData = await result?.json();
			toast.error(errorData.error || "Failed to cancel subscription");
			return;
		}

		toast.success("Subscription cancellation processed");
		onOpenChange(false);
		setLoading(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Cancel Subscription</DialogTitle>
				</DialogHeader>

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

								<div>
									<Label htmlFor="now" >
										Immediately
									</Label>
									<div className="text-xs text-muted-foreground">
										{format(new Date(), "MMM d, yyyy")}
									</div>
								</div>
							</div>

							<div className="flex flex-row items-start gap-3">
								<RadioGroupItem value="end" id="end" />

								<div >
									<Label htmlFor="end" >
										End of current period
									</Label>
									<div className="text-xs text-muted-foreground">
										{format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
									</div>
								</div>
							</div>

							<div className="flex flex-row items-start gap-3">
								<RadioGroupItem value="custom" id="custom" />

								<div className="w-full flex flex-col gap-2">
									<Label htmlFor="custom" >
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
							amount={sub.pricing?.price || 0}
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
							placeholder="Reason for cancellation"
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter className="bg-transparent sm:justify-between">
					<DialogClose asChild>
						<Button
							variant="outline"
							className="border-foreground/10"
							disabled={loading}
						>
							Don't cancel
						</Button>
					</DialogClose>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={loading}
					>
						{loading ? <Loader2 className="size-4 animate-spin" /> : "Cancel"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
