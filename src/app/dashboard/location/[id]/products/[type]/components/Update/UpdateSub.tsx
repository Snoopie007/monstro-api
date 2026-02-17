"use client";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Textarea,
} from "@/components/forms";
import {
	Button,
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogTitle,
	Switch,
	Badge,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import { useSubscriptions } from "@/hooks/usePlans";
import { UpdateSubPlanSchema } from "@/libs/FormSchemas";
import { MemberPlan } from "@subtrees/types";
import { Loader2 } from "lucide-react";
import { VisuallyHidden } from "react-aria";
import { toast } from "react-toastify";
import { useProducts } from "../../providers";
import AddPrograms from "../AddPrograms";
import { PricingOptions } from "../Create/PricingOptions";
import { SelectContract } from "../Create/SelectContract";

interface CreatePlanProps {
	lid: string;
	sub: MemberPlan;
	open: boolean;
	setOpen: (open: boolean) => void;
}

export function UpdateSub({ lid, sub, open, setOpen }: CreatePlanProps) {
	const { mutate: mutateSubs } = useSubscriptions(lid);
	const { groups } = useProducts();
	const [memberCount, setMemberCount] = useState<number | null>(null);
	const [isLoadingCount, setIsLoadingCount] = useState(false);

	const form = useForm<z.infer<typeof UpdateSubPlanSchema>>({
		resolver: zodResolver(UpdateSubPlanSchema),
		defaultValues: {
			name: sub.name,
			description: sub.description,
			programs: sub.planPrograms?.map((program) => program.program?.id) || [],
			allowProration: sub.allowProration,
			familyMemberLimit: sub.familyMemberLimit || 0,
      groupId: sub.groupId || undefined,
      intervalClassLimit: sub.totalClassLimit || undefined,
      makeUpCredits: sub.makeUpCredits || 0,
        contractId: sub.contractId ? String(sub.contractId) : undefined,
			currency: sub.currency || "USD",
			billingAnchor: sub.billingAnchorConfig?.day_of_month || undefined,
			pricingOptions:
				sub.pricings?.map((p) => ({
					id: p.id,
					name: p.name,
					price: p.price,
					interval: p.interval || undefined,
					intervalThreshold: p.intervalThreshold || 1,
					expireInterval: p.expireInterval || null,
					expireThreshold: p.expireThreshold || null,
					downpayment: p.downpayment || 0,
				})) || [],
		},
		mode: "onChange",
	});

	// Fetch member count when dialog opens
	useEffect(() => {
		if (open && memberCount === null) {
			const fetchCount = async () => {
				setIsLoadingCount(true);
				try {
					const response = await fetch(
						`/api/protected/loc/${lid}/plans/${sub.id}/members/count`
					);
					if (response.ok) {
						const data = await response.json();
						setMemberCount(data.count);
					}
				} catch (error) {
					console.error("Failed to fetch member count:", error);
				} finally {
					setIsLoadingCount(false);
				}
			};
			fetchCount();
		}
	}, [open, memberCount, lid, sub.id]);

	// Reset form values when dialog opens or subscription changes
	useEffect(() => {
		if (open) {
			form.reset({
				name: sub.name,
				description: sub.description,
				programs: sub.planPrograms?.map((program) => program.program?.id) || [],
				allowProration: sub.allowProration,
				familyMemberLimit: sub.familyMemberLimit || 0,
        groupId: sub.groupId || undefined,
        intervalClassLimit: sub.totalClassLimit || undefined,
        makeUpCredits: sub.makeUpCredits || 0,
      contractId: sub.contractId ? String(sub.contractId) : undefined,
				currency: sub.currency || "USD",
				billingAnchor: sub.billingAnchorConfig?.day_of_month || undefined,
				pricingOptions:
					sub.pricings?.map((p) => ({
						id: p.id,
						name: p.name,
						price: p.price,
						interval: p.interval || undefined,
						intervalThreshold: p.intervalThreshold || 1,
						expireInterval: p.expireInterval || null,
						expireThreshold: p.expireThreshold || null,
						downpayment: p.downpayment || 0,
					})) || [],
			});
		}
	}, [open, sub, form]);

	const hasMembers = memberCount !== null && memberCount > 0;

	async function onSubmit(v: z.infer<typeof UpdateSubPlanSchema>) {
		// Check if family limit is being decreased
		if (
			v.familyMemberLimit !== undefined &&
			v.familyMemberLimit < (sub.familyMemberLimit || 0)
		) {
			toast.error("Family limit can only be increased, not decreased");
			return;
		}

		try {
			const {
				pricingOptions: _pricingOptions,
				contractId: _contractId,
				intervalClassLimit: _intervalClassLimit,
				makeUpCredits: _makeUpCredits,
				currency: _currency,
				billingAnchor: _billingAnchor,
				...allowedFields
			} = v;

			const updatePayload = hasMembers ? allowedFields : v;

			const { result, error } = await tryCatch(
				fetch(`/api/protected/loc/${lid}/plans/updates/${sub.id}`, {
					method: "PUT",
					body: JSON.stringify(updatePayload),
				})
			);

			if (error || !result || !result.ok) {
				const data = await result?.json().catch(() => ({}));
				toast.error(data.error || error?.message || "Something went wrong");
				return;
			}

			toast.success(`Subscription updated successfully`);
			form.reset();
			await mutateSubs();
			setOpen(false);
		} catch (error) {
			console.error("Error updating subscription:", error);
			toast.error("Failed to update subscription");
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-lg border-foreground/10">
				<VisuallyHidden className="space-y-0">
					<DialogTitle></DialogTitle>
				</VisuallyHidden>
				<DialogBody>
					{isLoadingCount ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-5 animate-spin" />
						</div>
					) : (
						<>
							{hasMembers && (
								<Badge variant="secondary" className="mb-4">
									{memberCount} active member{memberCount !== 1 ? "s" : ""} - Limited editing
								</Badge>
							)}
							<Form {...form}>
								<form className="space-y-2">
									<fieldset className="grid grid-cols-1 gap-2">
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={"tiny"}>Name</FormLabel>
													<FormControl>
														<Input
															type="text"
															className={cn("")}
															placeholder="Name"
															{...field}
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
											name="description"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={"tiny"}>Description</FormLabel>
													<FormControl>
														<Textarea
															className={"resize-none h-8 border-foreground/10"}
															placeholder="Short description"
															{...field}
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
											name="programs"
											render={({ field }) => (
												<FormItem>
													<FormLabel size={"tiny"}>Select Programs</FormLabel>
													<FormDescription className="text-xs">
														Select at least one program that this plan will include.
													</FormDescription>
													<FormControl>
														<AddPrograms
															value={field.value || []}
															onChange={(selectedPrograms) => {
																field.onChange(selectedPrograms);
															}}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</fieldset>
									{groups && groups.length > 0 && (
										<fieldset>
											<FormField
												control={form.control}
												name="groupId"
												render={({ field }) => (
													<FormItem>
														<FormLabel size={"tiny"}>Add to Group (Optional)</FormLabel>
														<Select
															onValueChange={(value) => field.onChange(value === "none" ? null : value)}
															value={field.value || "none"}
														>
															<FormControl>
																<SelectTrigger>
																	<SelectValue placeholder="Select a group" />
																</SelectTrigger>
														</FormControl>
															<SelectContent>
																<SelectItem value="none">No group</SelectItem>
																{groups.map((group) => (
																	<SelectItem key={group.id} value={group.id}>
																		{group.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormDescription className="text-xs">
															Members will be automatically added to this group when they purchase this plan.
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										</fieldset>
									)}
									{sub.family && (
										<fieldset>
											<FormField
												control={form.control}
												name="familyMemberLimit"
												render={({ field }) => (
													<FormItem>
														<FormLabel size={"tiny"}>Family Member Limit</FormLabel>
														<FormDescription className="text-xs">
															You can only increase the limit, not decrease it.
														</FormDescription>
														<FormControl>
															<Input
																type="number"
																min={sub.familyMemberLimit || 0}
																className={cn("")}
																placeholder="Enter family member limit"
																{...field}
																onChange={(e) =>
																	field.onChange(
																		e.target.value
																			? parseInt(e.target.value)
																				: undefined
																		)
																}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</fieldset>
									)}
									<fieldset>
										<FormField
											control={form.control}
											name="allowProration"
											render={({ field }) => (
												<FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
													<FormControl>
														<Switch
															checked={field.value}
															onCheckedChange={field.onChange}
														/>
													</FormControl>
													<div className="space-y-0.5">
														<FormLabel className="text-sm">
															Allow proration
														</FormLabel>
														<FormDescription className="text-xs">
															Proration will allow you to charge the customer.
														</FormDescription>
													</div>
												</FormItem>
											)}
										/>
									</fieldset>

									{/* Full edit fields - only show if no members */}
									{!hasMembers && (
										<>
											<PricingOptions form={form} planType="recurring" />

											<fieldset>
												<FormField
													control={form.control}
													name="contractId"
													render={({ field }) => (
														<FormItem>
															<FormLabel size={"tiny"}>Contract (Optional)</FormLabel>
															<FormControl>
																<SelectContract
																	lid={lid}
																	value={field.value || null}
																	onChange={field.onChange}
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
													name="intervalClassLimit"
													render={({ field }) => (
														<FormItem>
															<FormLabel size={"tiny"}>Interval Class Limit (Optional)</FormLabel>
															<FormDescription className="text-xs">
																Maximum classes per billing interval.
															</FormDescription>
															<FormControl>
																<Input
																	type="number"
																	min={0}
																	placeholder="Unlimited"
																	{...field}
																	onChange={(e) =>
																		field.onChange(
																			e.target.value
																				? parseInt(e.target.value)
																				: undefined
																		)
																	}
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
													name="makeUpCredits"
													render={({ field }) => (
														<FormItem>
															<FormLabel size={"tiny"}>Make-up Credits</FormLabel>
															<FormDescription className="text-xs">
																Number of make-up credits per billing period.
															</FormDescription>
															<FormControl>
																<Input
																	type="number"
																	min={0}
																	placeholder="0"
																	{...field}
																	onChange={(e) =>
																		field.onChange(
																			e.target.value
																				? parseInt(e.target.value)
																				: 0
																		)
																	}
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
													name="billingAnchor"
													render={({ field }) => (
														<FormItem>
															<FormLabel size={"tiny"}>Billing Anchor (Optional)</FormLabel>
															<FormDescription className="text-xs">
																Day of the month for billing (1-28). Leave empty for signup date.
															</FormDescription>
															<FormControl>
																<Input
																	type="number"
																	min={1}
																	max={28}
																	placeholder="e.g., 1"
																	{...field}
																	onChange={(e) =>
																		field.onChange(
																			e.target.value
																				? parseInt(e.target.value)
																				: undefined
																		)
																	}
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</fieldset>
										</>
									)}
								</form>
							</Form>
						</>
					)}
				</DialogBody>
				<DialogFooter>
					<div className="flex flex-row gap-2 items-center">
						<DialogClose asChild>
							<Button
								size={"sm"}
								variant={"outline"}
								className="bg-transparent"
							>
								Cancel
							</Button>
						</DialogClose>
						<Button
							size={"sm"}
							onClick={form.handleSubmit(onSubmit)}
							variant={"foreground"}
							disabled={form.formState.isSubmitting || !form.formState.isValid}
						>
							{form.formState.isSubmitting ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								"Update"
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
