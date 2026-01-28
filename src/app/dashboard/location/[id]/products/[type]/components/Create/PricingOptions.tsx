"use client";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/forms";
import { Button } from "@/components/ui";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui";
import { cn } from "@/libs/utils";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import CurrencyInput from "react-currency-input-field";
import { useFieldArray } from "react-hook-form";
import { NewPlanSchema } from "@/libs/FormSchemas";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

interface PricingOptionsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: UseFormReturn<z.infer<typeof NewPlanSchema>>;
	planType: "recurring" | "one-time";
}

export function PricingOptions({ form, planType }: PricingOptionsProps) {
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "pricingOptions",
	});

	const addPricingOption = () => {
		append({
			name: fields.length === 0 ? "Standard" : `Option ${fields.length + 1}`,
			price: 0,
			interval: planType === "recurring" ? "month" : undefined,
			intervalThreshold: 1,
			expireInterval: null,
			expireThreshold: null,
			downpayment: 0,
		});
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<FormLabel size="tiny" className="text-sm font-medium">
					Pricing Options
				</FormLabel>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={addPricingOption}
					className="h-7 text-xs gap-1"
				>
					<Plus className="size-3" />
					Add Pricing
				</Button>
			</div>

			{fields.length === 0 && (
				<div className="border border-dashed border-foreground/20 rounded-lg p-4 text-center">
					<p className="text-sm text-muted-foreground">
						No pricing options yet. Add at least one pricing option.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addPricingOption}
						className="mt-2"
					>
						<Plus className="size-3 mr-1" />
						Add Pricing Option
					</Button>
				</div>
			)}

			<div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="border border-foreground/10 rounded-lg p-3 space-y-2 relative bg-background/50"
					>
						{fields.length > 1 && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => remove(index)}
								className="absolute top-2 right-2 h-6 w-6 text-destructive hover:text-destructive"
							>
								<Trash2 className="size-3" />
							</Button>
						)}

						<div className="grid grid-cols-2 gap-2">
							<FormField
								control={form.control}
								name={`pricingOptions.${index}.name`}
								render={({ field }) => (
									<FormItem>
										<FormLabel size="tiny">Name</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Monthly, 6-Month"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name={`pricingOptions.${index}.price`}
								render={({ field }) => (
									<FormItem>
										<FormLabel size="tiny">Price</FormLabel>
										<FormControl>
											<CurrencyInput
												className={cn(
													"inline-block w-full  h-12 rounded-lg bg-background border border-foreground/10 px-4"
												)}
												value={field.value ? field.value / 100 : 0}
												onValueChange={(value) => {
													const price = value ? Math.round(Number(value) * 100) : 0;
													field.onChange(price);
												}}
												decimalsLimit={2}
												allowNegativeValue={false}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{planType === "recurring" && (
							<div className="grid grid-cols-2 gap-2">
								<FormField
									control={form.control}
									name={`pricingOptions.${index}.interval`}
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Billing Interval</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value || "month"}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select..." />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{["day", "week", "month", "year"].map((interval) => (
														<SelectItem key={interval} value={interval}>
															{interval.charAt(0).toUpperCase() + interval.slice(1)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name={`pricingOptions.${index}.intervalThreshold`}
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Every</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													placeholder="1"
													{...field}
													onChange={(e) =>
														field.onChange(parseInt(e.target.value) || 1)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{/* Downpayment and Term/Expiration fields */}
						<div className="grid grid-cols-2 gap-2">
							<FormField
								control={form.control}
								name={`pricingOptions.${index}.downpayment`}
								render={({ field }) => (
									<FormItem>
										<div className="flex items-center gap-1">
											<FormLabel size="tiny">Downpayment</FormLabel>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger type="button">
														<HelpCircle className="size-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Optional upfront payment collected when the member
															signs up for this plan.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<FormControl>
											<CurrencyInput
												className={cn(
													"inline-block w-full  h-12 rounded-lg bg-background border border-foreground/10 px-4"
												)}
												value={field.value ? field.value / 100 : 0}
												onValueChange={(value) => {
													const downpayment = value ? Math.round(Number(value) * 100) : 0;
													field.onChange(downpayment);
												}}
												allowNegativeValue={false}

												decimalsLimit={2}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name={`pricingOptions.${index}.expireInterval`}
								render={({ field }) => (
									<FormItem>
										<div className="flex items-center gap-1">
											<FormLabel size="tiny">Term Interval</FormLabel>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger type="button">
														<HelpCircle className="size-3 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															How long until the plan auto-cancels or expires.
															Leave empty for ongoing subscriptions or packages
															that never expire.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<Select
											onValueChange={(value) =>
												field.onChange(value === "none" ? null : value)
											}
											value={field.value || "none"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="No expiration" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">No expiration</SelectItem>
												<SelectItem value="day">Days</SelectItem>
												<SelectItem value="week">Weeks</SelectItem>
												<SelectItem value="month">Months</SelectItem>
												<SelectItem value="year">Years</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						{form.watch(`pricingOptions.${index}.expireInterval`) && (
							<div className="grid grid-cols-2 gap-2">
								<div /> {/* Empty spacer to align with downpayment */}
								<FormField
									control={form.control}
									name={`pricingOptions.${index}.expireThreshold`}
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Term Length</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={1}
													placeholder="e.g., 6"
													{...field}
													value={field.value || ""}
													onChange={(e) =>
														field.onChange(
															e.target.value ? parseInt(e.target.value) : null
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}
					</div>
				))}
			</div>

			{form.formState.errors.pricingOptions?.message && (
				<p className="text-sm text-destructive">
					{form.formState.errors.pricingOptions.message}
				</p>
			)}
		</div>
	);
}

