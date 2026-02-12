"use client";
import {
	Button, DialogFooter,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,

	DialogClose, Switch
} from "@/components/ui";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
	Input,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";
import { format, intervalToDuration } from "date-fns";
import { MemberPaymentMethod, MemberSubscription } from "@subtrees/types";
import { EndDayPicker } from ".";
import { useMemberStatus } from "../../../providers";
import { useMemberSubscriptions } from "@/hooks";

const UpdateSubSchema = z.object({
	endAt: z.date().optional(),
	paymentMethodId: z.string().optional(),
	trialDays: z.number().min(0, "Trial days must be non-negative").optional(),
	allowProration: z.boolean(),
	reset: z.boolean(),
});

interface UpdateSubProps {
	sub: MemberSubscription;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UpdateSub({ sub, open, onOpenChange }: UpdateSubProps) {
	const { mutate } = useMemberSubscriptions(sub.locationId, sub.memberId)
	const [paymentMethod, setPaymentMethod] = useState<MemberPaymentMethod | null>(null);
	const { ml } = useMemberStatus();
	const paymentMethods = ml.memberPaymentMethods;
	const params = useParams();

	// Use cancelAt for the scheduled end date
	const rawEndDate = sub.cancelAt;
	const effectiveEndDate = rawEndDate ? new Date(rawEndDate) : null;

	const form = useForm<z.infer<typeof UpdateSubSchema>>({
		resolver: zodResolver(UpdateSubSchema),
		defaultValues: {
			endAt: effectiveEndDate || undefined,
			trialDays: 0,
			allowProration: sub.plan?.allowProration,
			reset: false,
		},
	});

	useEffect(() => {
		if (sub.status === "trialing" && sub.trialEnd) {
			const trialDays = intervalToDuration({
				start: new Date(),
				end: new Date(sub.trialEnd),
			});
			form.setValue("trialDays", trialDays.days || 0, { shouldValidate: true });
		}
	}, [sub]);



	async function onSubmit(v: z.infer<typeof UpdateSubSchema>) {
		if (!sub.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}



		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subs/${sub.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(v),
			})
		);



		if (error || !result || !result.ok) {
			toast.error("Failed to update subscription");
			return;
		}

		await mutate();
		toast.success("Subscription updated successfully");
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update Subscription</DialogTitle>
				</DialogHeader>
				<div>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">

							<fieldset className="space-y-4">
								<FormLabel size={"tiny"}>Duration</FormLabel>
								<div className="flex flex-row gap-2 items-center">
									<span className="text-sm font-medium">
										{format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}
									</span>
									<ArrowRight className="size-3.5 " />
									<FormField
										control={form.control}
										name="endAt"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<EndDayPicker
														onChange={field.onChange}
														startDate={sub.currentPeriodStart}
														endDate={field.value || effectiveEndDate}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</fieldset>

							{sub.paymentType !== "cash" && (
								<fieldset >
									{sub.status === "trialing" && (
										<FormField
											control={form.control}
											name="trialDays"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={"tiny"}>Add Trial Days</FormLabel>
													<FormControl>
														<Input
															type="number"
															className="rounded-sm"
															{...field}
															onChange={(e) =>
																field.onChange(parseInt(e.target.value) || 0)
															}
														/>
													</FormControl>

													<FormMessage />
												</FormItem>
											)}
										/>
									)}
								</fieldset>
							)}

							<fieldset>
								<FormField
									control={form.control}
									name="reset"
									render={({ field }) => (
										<FormItem className="flex flex-row bg-foreground/5 items-center gap-3 rounded-lg border border-foreground/10 p-3 ">
											<FormControl>
												<Switch
													className="-mt-1"
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<div className="space-y-0.5">
												<FormLabel className="text-sm">
													Reset billing cycle
												</FormLabel>
												<FormDescription className="text-xs">
													Will immediately restart the billing cycle as of today and
													charge again.
												</FormDescription>
											</div>
										</FormItem>
									)}
								/>
							</fieldset>
							{sub.paymentType !== "cash" && (
								<fieldset>
									<FormField
										control={form.control}
										name="allowProration"
										render={({ field }) => (
											<FormItem className="flex flex-row bg-foreground/5 items-center gap-3 rounded-lg border border-foreground/10 p-3 ">
												<FormControl>
													<Switch
														className="-mt-1"
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
												<div className="space-y-0.5">
													<FormLabel className="text-sm">
														Proration Changes
													</FormLabel>
													<FormDescription className="text-xs">
														Enable proration for plan changes.
													</FormDescription>
												</div>
											</FormItem>
										)}
									/>
								</fieldset>
							)}
						</form>
					</Form>
					<DialogFooter className="flex flex-row gap-2 sm:justify-between">
						<DialogClose asChild>
							<Button variant="outline" className="border-foreground/10" disabled={form.formState.isSubmitting}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="submit"
							variant="primary"
							disabled={form.formState.isSubmitting || !form.formState.isValid}
							onClick={form.handleSubmit(onSubmit)}
						>
							{form.formState.isSubmitting ? <Loader2 className=" size-4 animate-spin" /> : "Update Subscription"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
