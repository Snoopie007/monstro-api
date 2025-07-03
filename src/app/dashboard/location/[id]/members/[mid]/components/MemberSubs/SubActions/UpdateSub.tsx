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
import { MemberSubscription } from "@/types";
import { VisuallyHidden } from "react-aria";



const UpdateSubSchema = z.object({
	cancelAt: z.string().optional(), // ISO date string or empty
	trialDays: z.number().min(0, "Trial days must be non-negative").optional(),
	allowProration: z.boolean().optional(),
});


interface UpdateSubProps {
	sub: MemberSubscription;
	close?: () => void;
	show: boolean;
}

export function UpdateSub({ sub, close, show }: UpdateSubProps) {
	const [open, setOpen] = useState(show);
	const [loading, setLoading] = useState(false);
	const params = useParams();

	const form = useForm<z.infer<typeof UpdateSubSchema>>({
		resolver: zodResolver(UpdateSubSchema),
		defaultValues: {
			cancelAt: sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), "yyyy-MM-dd") : "",
			trialDays: 0,
			allowProration: sub.plan?.allowProration,
		},
	});

	async function onSubmit(v: z.infer<typeof UpdateSubSchema>) {
		if (!sub.id || !params?.id || !params?.mid) {
			toast.error("Missing required information");
			return;
		}

		setLoading(true);



		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subscriptions`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(v),
			})
		);

		setLoading(false);

		if (error || !result || !result.ok) {
			toast.error("Failed to update subscription");
			return;
		}

		toast.success("Subscription updated successfully");
		setOpen(false);
		close?.();
	}

	return (
		<>

			<DialogBody>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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

						{sub.stripeSubscriptionId && (
							<FormField
								control={form.control}
								name="cancelAt"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Cancel at Period End (
											{format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")})
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
								{sub.stripeSubscriptionId
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
		</>
	);
}