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
import { NewPlanSchema } from "@/libs/FormSchemas";
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
import { PricingOptions } from "./PricingOptions";
import { PlanSubFields } from "./SubFields";

interface CreatePlanProps {
	lid: string;
	type: "subs" | "pkgs";
}

export function CreatePlan({ lid, type }: CreatePlanProps) {
	const [open, setOpen] = useState(false);
	const { mutate: mutateSubs } = useSubscriptions(lid);
	const { mutate: mutatePkgs } = usePackages(lid);
	const { groups } = useProducts();

	const form = useForm<z.infer<typeof NewPlanSchema>>({
		resolver: zodResolver(NewPlanSchema),
		defaultValues: {
			name: "",
			description: "",
			type: type === "subs" ? "recurring" : "one-time",
			family: false,
			familyMemberLimit: 0,
			pricingOptions: [{
				name: "Standard",
				price: 0,
				interval: type === "subs" ? "month" : undefined,
				intervalThreshold: 1,
				expireInterval: null,
				expireThreshold: null,
			}],
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

	async function onSubmit(v: z.infer<typeof NewPlanSchema>) {
		if (form.formState.isSubmitting) return;

		try {
			const { pkg, sub, pricingOptions, ...rest } = v;
			const { result, error } = await tryCatch(
				fetch(`/api/protected/loc/${lid}/plans/${type}`, {
					method: "POST",
					body: JSON.stringify({
						...rest,
						pricingOptions,
						...(type === "subs" ? { ...sub } : { ...pkg }),
					}),
				})
			);

			if (error || !result || !result.ok) {
				toast.error(error?.message || "Something went wrong");
				return;
			}

			toast.success(
				`${type === "subs" ? "Subscription" : "Package"} created successfully`
			);
			form.reset();
			if (type === "subs") {
				await mutateSubs();
			} else {
				await mutatePkgs();
			}
			setOpen(false);
		} catch (error) {
			console.error("Error creating plan:", error);
			toast.error("Failed to create plan");
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button

					variant={"primary"}
					className=" items-center gap-2"
				>
					{type === "subs" ? "Subscription" : "Package"}
					<Plus className="size-3.5 text-white" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg border-foreground/10 max-h-[90vh] flex flex-col">
				<VisuallyHidden className="space-y-0">
					<DialogTitle>
					</DialogTitle>
				</VisuallyHidden>
				<DialogBody className="overflow-y-auto flex-1">
					<Form {...form}>
						<form className="space-y-2">
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
							<PricingOptions 
								form={form} 
								planType={type === "subs" ? "recurring" : "one-time"} 
							/>
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
				</DialogBody>
				<DialogFooter>
					<div className="flex flex-row gap-2 items-center">
						<DialogClose asChild>
							<Button

								variant={"outline"}
								className="border-foreground/10"
							>
								Cancel
							</Button>
						</DialogClose>
						<Button

							onClick={form.handleSubmit(onSubmit)}
							variant={"primary"}
							disabled={form.formState.isSubmitting || !form.formState.isValid}
						>
							{form.formState.isSubmitting ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Save"
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
