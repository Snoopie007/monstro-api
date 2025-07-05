'use client'
import {
	Button,
	DialogFooter,
	DialogClose,
	Switch,
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CalendarIcon, Loader2 } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useState } from "react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { MemberSubscription } from "@/types";
import { EndDayPicker, PaymentMethodPicker } from ".";


const UpdateSubSchema = z.object({
	paymentType: z.enum(["card", "cash", "check", "zelle", "venmo", "paypal", "apple", "google"]),
	endAt: z.date().optional(),
	paymentMethodId: z.string().optional(),
	trialDays: z.number().min(0, "Trial days must be non-negative").optional(),
	allowProration: z.boolean().default(false),
	reset: z.boolean().default(false),
});


interface UpdateSubProps {
	sub: MemberSubscription;
	show: boolean;
	close: () => void;
}

export function UpdateSub({ sub, show, close }: UpdateSubProps) {

	const [loading, setLoading] = useState(false);
	const params = useParams();

	const form = useForm<z.infer<typeof UpdateSubSchema>>({
		resolver: zodResolver(UpdateSubSchema),
		defaultValues: {
			paymentType: sub.paymentMethod,
			endAt: sub.cancelAt || undefined,
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
		close();
	}

	return (
		<div className={cn(show ? 'block' : 'hidden')}>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 p-4">
					<fieldset className="space-y-4">
						<FormLabel size={'tiny'}>Duration</FormLabel>
						<div className="flex flex-row gap-2 items-center">
							<span className="text-sm font-medium">
								{format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}

							</span>
							<ArrowRight className="size-3.5 -mt-0.5" />
							<EndDayPicker onChange={() => { }}
								startDate={sub.currentPeriodStart}
								endDate={sub.cancelAt}
							/>
						</div>
					</fieldset>
					<fieldset>
						<FormField
							control={form.control}
							name="paymentType"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={'tiny'}>Payment Type</FormLabel>
									<FormControl>
										<Select {...field}>
											<SelectTrigger>
												<SelectValue placeholder="Select a payment type" />
											</SelectTrigger>
											<SelectContent>
												{['card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google'].map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
								</FormItem>
							)}
						/>
					</fieldset>
					{form.watch("paymentType") === "card" && (
						<fieldset>
							<FormLabel size={'tiny'}>Payment Method</FormLabel>
							<FormField
								control={form.control}
								name="paymentMethodId"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<PaymentMethodPicker method={sub.metadata} />
										</FormControl>
									</FormItem>
								)}
							/>

						</fieldset>
					)}
					<fieldset>
						<FormField
							control={form.control}
							name="trialDays"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={'tiny'}>Add Trial Days</FormLabel>
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

									<FormMessage />
								</FormItem>
							)}
						/>
					</fieldset>
					<fieldset>
						<FormField
							control={form.control}
							name="reset"
							render={({ field }) => (
								<FormItem className="flex flex-row bg-background items-center gap-3 rounded-sm border border-foreground/10 py-2 px-3 ">

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
											Will immediately restart the billing cycle as of today and charge again.
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>
					</fieldset>
					<fieldset>
						<FormField
							control={form.control}
							name="allowProration"
							render={({ field }) => (
								<FormItem className="flex flex-row bg-background items-center gap-3 rounded-sm border border-foreground/10 py-2 px-3 ">

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
				</form>
			</Form>
			<DialogFooter className="flex flex-row gap-2 sm:justify-between">
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
					Update Subscription
				</Button>
			</DialogFooter>
		</div>
	);
}



