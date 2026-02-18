"use client";
import { useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberSubscription } from "@subtrees/types/member";
import { useParams } from "next/navigation";
import { RefundOptions } from "./RefundOptions";
import { DayFieldPopover } from "./DayFieldPopover";
import { useSession } from "@/hooks/useSession";
import { clientsideApiClient } from "@/libs/api/client";

interface CancelSubProps {
	sub: MemberSubscription;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CancelSub({ sub, open, onOpenChange }: CancelSubProps) {
	const params = useParams();
	const { data: session } = useSession();
	const api = useMemo(() => {
		if (!session?.user?.sbToken) return null;
		return clientsideApiClient(session.user.sbToken);
	}, [session?.user?.sbToken]);

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

		if (!api) {
			toast.error("Session not ready. Please try again.");
			return;
		}

		if (formState.cancelOption === "custom" && !formState.customDate) {
			toast.error("Please select a cancellation date");
			return;
		}

		setLoading(true);

		const mode = formState.cancelOption === "now"
			? "now"
			: formState.cancelOption === "end"
				? "end_of_period"
				: "at_date";

		try {
			await api.post(`/x/loc/${params.id}/subscriptions/${sub.id}/cancel`, {
				mode,
				cancelAt: formState.cancelOption === "custom" ? formState.customDate : null,
				reason: formState.reason || undefined,
				refund: {
					enabled: formState.refundAmount > 0,
					amountType: formState.refundAmount > 0 ? "full" : undefined,
					amount: formState.refundAmount > 0 ? formState.refundAmount : undefined,
				},
			});

			toast.success("Subscription cancellation processed");
			onOpenChange(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to cancel subscription";
			toast.error(message);
		} finally {
			setLoading(false);
		}
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
									...(value !== "now" ? { refundAmount: 0 } : {}),
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

					{sub.paymentType !== "cash" && formState.cancelOption === "now" && (
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
