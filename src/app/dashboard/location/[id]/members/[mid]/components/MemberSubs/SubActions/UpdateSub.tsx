'use client'
import {
	Button,
	DialogBody,
	DialogFooter,
	DialogClose,
	Switch,
	DialogContent,
	Dialog,
	DialogTrigger,
	DialogTitle,
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
	Textarea,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Edit2, Loader2 } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useState } from "react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { formatAmountForDisplay } from "@/libs/utils";
import { MemberPlan } from "@/types";
import { useSubscriptions } from "@/hooks";
import { VisuallyHidden } from "react-aria";

interface Subscription {
	id: number;
	status: string;
	currentPeriodEnd: Date;
	paymentMethod: string;
	stripeSubscriptionId?: string | null;
	plan: {
		id: number;
		name: string;
		description: string;
		price: number;
		currency: string;
		interval: string;
		allowProration: boolean;
		stripePriceId?: string;
	};
}

const UpdateSubscriptionSchema = z.object({
	planId: z.string().min(1, "Plan is required"),
	cancelAt: z.string().optional(), // ISO date string or empty
	trialDays: z.number().min(0, "Trial days must be non-negative").optional(),
	allowProration: z.boolean().optional(),
});

type UpdateFormData = z.infer<typeof UpdateSubscriptionSchema>;

interface SubscriptionUpdateDialogProps {
	subscription: Subscription;
	onUpdate?: () => void;
}

export function SubscriptionUpdateDialog({ subscription, onUpdate }: SubscriptionUpdateDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const params = useParams();
	const { subscriptions } = useSubscriptions(params.id as string);

	const form = useForm<UpdateFormData>({
		resolver: zodResolver(UpdateSubscriptionSchema),
		defaultValues: {
			planId: subscription.plan.id.toString(),
			cancelAt: subscription.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), "yyyy-MM-dd") : "",
			trialDays: 0,
			allowProration: subscription.plan.allowProration,
		},
	});

	async function onSubmit(data: UpdateFormData) {
		if (!subscription?.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}

		setLoading(true);

		const updates: Partial<UpdateFormData> = {};

		if (parseInt(data.planId) !== subscription.plan.id) {
			updates.planId = data.planId;
		}
		if (data.cancelAt !== (subscription.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), "yyyy-MM-dd") : "")) {
			updates.cancelAt = data.cancelAt || undefined;
		}
		if (data.trialDays !== undefined && data.trialDays !== 0) {
			updates.trialDays = data.trialDays;
		}
		if (data.allowProration !== subscription.plan.allowProration) {
			updates.allowProration = data.allowProration;
		}

		if (Object.keys(updates).length === 0) {
			toast.info("No changes detected");
			setLoading(false);
			setOpen(false);
			return;
		}
		console.log("Updates:", updates);

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subscriptions`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			})
		);

		setLoading(false);

		if (error || !result || !result.ok) {
			toast.error("Failed to update subscription");
			return;
		}

		toast.success("Subscription updated successfully");
		form.reset(data);
		setOpen(false);
		onUpdate?.();
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
					disabled={!subscription}
				>
					<Edit2 className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<VisuallyHidden>
					<DialogTitle>Update Subscription</DialogTitle>
				</VisuallyHidden>
				<DialogBody>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="planId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Plan Name</FormLabel>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<FormControl>
												<SelectTrigger className="rounded-sm">
													<SelectValue placeholder="Select a plan" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{subscriptions ? (
													subscriptions.map((sub: MemberPlan) => (
														sub.id ? (
															<SelectItem key={sub.id} value={sub.id.toString()}>
																{sub.name} - {formatAmountForDisplay(sub.price / 100, sub.currency)}/{sub.interval}
															</SelectItem>
														) : null
													))
												) : (
													<SelectItem value="loading" disabled>Loading plans...</SelectItem>
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="trialDays"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Trial Days</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="0"
												min="0"
												className="rounded-sm"
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
											/>
										</FormControl>
										<FormDescription className="text-xs">
											Enter the number of trial days (0 to remove trial).
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="allowProration"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<div className="space-y-0.5">
											<FormLabel className="text-sm">Allow Proration</FormLabel>
											<FormDescription className="text-xs">
												Enable proration for plan changes.
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>

							{subscription.stripeSubscriptionId && (
								<FormField
									control={form.control}
									name="cancelAt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Cancel at Period End (
												{format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")})
											</FormLabel>
											<FormControl>
												<Input
													type="date"
													className="rounded-sm"
													{...field}
													onChange={(e) => field.onChange(e.target.value)}
												/>
											</FormControl>
											<FormDescription className="text-xs">
												Leave blank to remove cancellation.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
								<p className="text-sm text-blue-800">
									{subscription.stripeSubscriptionId
										? "Changes will update both your local records and Stripe subscription."
										: "Changes will update your local records only."}
								</p>
							</div>
						</form>
					</Form>
				</DialogBody>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" size="sm" disabled={loading}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						type="submit"
						variant="foreground"
						size="sm"
						disabled={loading || !form.formState.isValid}
						onClick={form.handleSubmit(onSubmit)}
					>
						{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}