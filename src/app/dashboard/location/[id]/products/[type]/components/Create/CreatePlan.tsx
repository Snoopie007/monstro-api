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
	DialogTrigger,
} from "@/components/ui";
import { CreatePlanStep1Schema } from "@/libs/FormSchemas";
import { cn, tryCatch } from "@/libs/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";


import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import { usePackages, useSubscriptions } from "@/hooks/usePlans";
import { Loader2, Plus } from "lucide-react";
import { VisuallyHidden } from "react-aria";
import { toast } from "react-toastify";
import { useProducts } from "../../providers";
import AddPrograms from "../AddPrograms";
import { PlanPkgFields } from "./PkgFields";
import { PlanSubFields } from "./SubFields";
import { PricingStep } from "./PricingStep";

interface CreatePlanProps {
	lid: string;
	type: "subs" | "pkgs";
}

export function CreatePlan({ lid, type }: CreatePlanProps) {
	const [open, setOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState(1);
	const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { mutate: mutateSubs } = useSubscriptions(lid);
	const { mutate: mutatePkgs } = usePackages(lid);
	const { groups } = useProducts();

	const form = useForm<z.infer<typeof CreatePlanStep1Schema>>({
		resolver: zodResolver(CreatePlanStep1Schema),
		defaultValues: {
			name: "",
			description: "",
			type: type === "subs" ? "recurring" : "one-time",
			family: false,
			familyMemberLimit: 0,
			programs: [],
			intervalClassLimit: undefined,
			sub: {
				allowProration: false,
				billingAnchor: undefined,
			},
			pkg: {
				totalClassLimit: type === "pkgs" ? 1 : 0,
			},
			contractId: undefined,
			groupId: undefined,
		},
		mode: "onChange",
	});

	async function createPlan(v: z.infer<typeof CreatePlanStep1Schema>) {
		setIsSubmitting(true);
		try {
			const { pkg, sub, ...rest } = v;
			const { result, error } = await tryCatch(
				fetch(`/api/protected/loc/${lid}/plans/${type}`, {
					method: "POST",
					body: JSON.stringify({
						...rest,
						...(type === "subs" ? { ...sub } : { ...pkg }),
					}),
				})
			);

			if (error || !result || !result.ok) {
				toast.error(error?.message || "Failed to create plan");
				return null;
			}

			const createdPlan = await result.json();
			setCreatedPlanId(createdPlan.id);
			setCurrentStep(2);
			toast.success("Plan created. Now add pricing options.");
			return createdPlan.id;
		} catch (error) {
			console.error("Error creating plan:", error);
			toast.error("Failed to create plan");
			return null;
		} finally {
			setIsSubmitting(false);
		}
	}

	function handlePricingSuccess() {
		toast.success(
			`${type === "subs" ? "Subscription" : "Package"} created successfully`
		);
		form.reset();
		setCurrentStep(1);
		setCreatedPlanId(null);
		setOpen(false);
		if (type === "subs") {
			mutateSubs();
		} else {
			mutatePkgs();
		}
	}

	function handlePricingError(error: string) {
		toast.error(error);
	}

	function handleDialogOpenChange(newOpen: boolean) {
		if (!newOpen && currentStep === 2 && createdPlanId) {
			const confirmed = window.confirm(
				"You have unsaved pricing options. Are you sure you want to close?"
			);
			if (!confirmed) return;
		}
		setOpen(newOpen);
		if (!newOpen) {
			setCurrentStep(1);
			setCreatedPlanId(null);
			form.reset();
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant={"primary"}
					className="items-center gap-2"
				>
					{type === "subs" ? "Subscription" : "Package"}
					<Plus className="size-3.5 text-white" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg border-foreground/10 max-h-[90vh] flex flex-col">
				<VisuallyHidden className="space-y-0">
					<DialogTitle>
						{currentStep === 1 ? "Create Plan" : "Add Pricing Options"}
					</DialogTitle>
				</VisuallyHidden>
				<DialogBody className="overflow-y-auto flex-1">
					{currentStep === 1 ? (
						<Form {...form}>
							<form className="space-y-2">
								<div className="flex items-center gap-2 mb-4">
									<div className="flex-1">
										<div className="text-sm font-medium text-muted-foreground">Step 1 of 2</div>
										<div className="text-lg font-semibold">Plan Details</div>
									</div>
									<div className="flex gap-1">
										<div className="w-8 h-2 rounded-full bg-primary" />
										<div className="w-8 h-2 rounded-full bg-muted" />
									</div>
								</div>

								<fieldset>
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
														onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
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
								{type === "subs" && <PlanSubFields lid={lid} form={form} />}
								{type === "pkgs" && <PlanPkgFields lid={lid} form={form} />}
							</form>
						</Form>
					) : createdPlanId ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2 mb-4">
								<div className="flex-1">
									<div className="text-sm font-medium text-muted-foreground">Step 2 of 2</div>
									<div className="text-lg font-semibold">Pricing Options</div>
								</div>
								<div className="flex gap-1">
									<div className="w-8 h-2 rounded-full bg-muted" />
									<div className="w-8 h-2 rounded-full bg-primary" />
								</div>
							</div>
							<PricingStep
								planId={createdPlanId}
								locationId={lid}
								type={type}
								onSuccess={handlePricingSuccess}
								onError={handlePricingError}
							/>
						</div>
					) : null}
				</DialogBody>
				<DialogFooter>
					<div className="flex flex-row gap-2 items-center w-full">
						{currentStep === 1 ? (
							<>
								<DialogClose asChild>
									<Button variant={"outline"} className="border-foreground/10">
										Cancel
									</Button>
								</DialogClose>
								<Button
									type="button"
									onClick={form.handleSubmit(createPlan)}
									variant={"primary"}
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											<span>Creating...</span>
										</>
									) : (
										"Next"
									)}
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant={"outline"}
								className="border-foreground/10"
								onClick={() => setCurrentStep(1)}
							>
								Back
							</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
