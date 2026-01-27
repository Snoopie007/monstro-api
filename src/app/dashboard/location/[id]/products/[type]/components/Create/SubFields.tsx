"use client";
import {
	FormControl,
	FormField,
	FormMessage,
	FormItem,
	FormLabel,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	Input,
	FormDescription,
} from "@/components/forms";

import { z } from "zod";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
	Switch,
	CollapsibleContent,
	Collapsible,
	CollapsibleTrigger,
} from "@/components/ui";
import {
	NewPlanSchema,
	BillingAnchorConfigSchema,
} from "@/libs/FormSchemas";
import { cn } from "@/libs/utils";
import { ChevronRight } from "lucide-react";
import { SelectContract } from ".";

interface SubFieldsProps {
	form: UseFormReturn<z.infer<typeof NewPlanSchema>>;
	lid: string;
}

export function PlanSubFields({ lid, form }: SubFieldsProps) {
	return (
		<div className="space-y-2">
			<fieldset className="grid grid-cols-2 gap-2 items-baseline">
				<FormField
					control={form.control}
					name="contractId"
					render={({ field }) => (
						<FormItem>
							<FormLabel size={"tiny"}>Attach a Contract</FormLabel>

							<SelectContract lid={lid} value={field.value} onChange={field.onChange} />
							<FormMessage />
							<FormDescription className="text-xs">
								Leave blank to not attach a contract.
							</FormDescription>
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="intervalClassLimit"
					render={({ field }) => (
						<FormItem className="col-span-1">
							<FormLabel size={"tiny"}>Class Limit Per Week</FormLabel>
							<FormControl>
								<Input
									type="number"
									placeholder=""
									onChange={(e) => {
										const value = e.target.value;
										field.onChange(value ? parseInt(value) : undefined);
									}}
									value={field.value || ""}
								/>
							</FormControl>
							<FormMessage />
							<FormDescription className="text-xs">
								Leave blank for unlimited.
							</FormDescription>
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
							<FormControl>
								<Input
									type="number"
									placeholder="0"
									min={0}
									onChange={(e) => {
										const value = e.target.value;
										field.onChange(value ? parseInt(value) : undefined);
									}}
									value={field.value || ""}
								/>
							</FormControl>
							<FormDescription className="text-xs">
								Number of make-up classes included per billing period. Leave blank or 0 for none.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</fieldset>

			<Collapsible>
				<CollapsibleTrigger className="flex group flex-row items-center gap-1 ">
					<ChevronRight
						size={15}
						className="group-data-[state=open]:rotate-90"
					/>
					<span className="text-[0.7rem] uppercase font-medium cursor-pointer">
						Subscription Options{" "}
						<span className=" text-red-500">(Optional)</span>
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="bg-background rounded-sm  space-y-2 p-4">
					<fieldset>
						<FormField
							control={form.control}
							name="family"
							render={({ field }) => (
								<FormItem className="flex bg-background flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className="space-y-0.5">
										<FormLabel className="text-sm">Family Plan</FormLabel>
										<FormDescription className="text-xs">
											Allow additional family members to be added.
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>
					</fieldset>
					{form.getValues("family") && (
						<fieldset>
							<FormField
								control={form.control}
								name="familyMemberLimit"
								render={({ field }) => (
									<FormItem>
										<FormLabel size={"tiny"}>Number of Family</FormLabel>
										<FormControl>
											<Input
												type="number"
												className={cn("")}
												{...field}
												onChange={(e) => {
													const value = e.target.value;
													field.onChange(value ? parseInt(value) : undefined);
												}}
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
							name="sub.allowProration"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<div className="space-y-0.5">
										<FormLabel className="text-sm">Allow proration</FormLabel>
										<FormDescription className="text-xs">
											Proration will allow you to charge the customer.
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>
					</fieldset>
					<fieldset>
						<FormField
							control={form.control}
							name="sub.billingAnchor"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={"tiny"}>Billing Anchor (Monthly Plans)</FormLabel>
									<FormDescription className="text-xs">
										For monthly billing, you can set the billing to start on a specific day.
									</FormDescription>
									<FormControl>
										<Select
											onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
											value={field.value?.toString() || "none"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select..." />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">Default (signup date)</SelectItem>
												{BillingAnchorConfigSchema.map((anchor, index) => (
													<SelectItem key={index} value={anchor.value.toString()}>
														{anchor.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</fieldset>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
