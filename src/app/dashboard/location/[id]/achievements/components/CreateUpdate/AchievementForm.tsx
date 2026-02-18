"use client";

import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Input,
	Textarea,
	Form,
	Select, SelectValue, SelectTrigger, SelectContent, SelectItem,
} from "@/components/forms";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { AchievementIcons } from "..";
import { PlusIcon, XIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { AchievementSchema } from "../../schemas";
import { useEffect, useState, useRef } from "react";
import { MemberPlan } from "@subtrees/types/member";
import { AchievementTriggers } from "@/libs/data";
import { Skeleton } from "@/components/ui";

interface AchievementFieldsProps {
	lid: string;
	form: UseFormReturn<z.infer<typeof AchievementSchema>>;
}

export function AchievementForm({ lid, form }: AchievementFieldsProps) {
	const badge = form.watch("badge");
	const [loading, setLoading] = useState(false);
	const [memberPlans, setMemberPlans] = useState<MemberPlan[]>([]);
	const hasFetchedRef = useRef(false);

	async function fetchMemberPlans(signal: AbortSignal) {
		if (hasFetchedRef.current || memberPlans.length > 0) return;
		hasFetchedRef.current = true;
		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/plans`, {
				method: 'GET',
				signal,
			})
		);
		if (error || !result || !result.ok) {
			setLoading(false);
			hasFetchedRef.current = false;
			return;
		}
		const data = await result.json();
		setMemberPlans(data);
		setLoading(false);
	}

	useEffect(() => {
		const control = new AbortController();
		fetchMemberPlans(control.signal);
		return () => control.abort();
	}, []);

	return (
		<Form {...form}>
			<form className="space-y-4 p-4">

				<fieldset>
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel size={"tiny"}> Name</FormLabel>
								<FormControl>
									<Input
										type="text"
										className={cn()}
										placeholder="Name"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</fieldset>
				<fieldset className="space-y-1">
					<p className="bg-foreground/5 p-4 rounded-lg text-sm text-muted-foreground">
						Points are rewarded for completing of the achievement. Required
						count is the number of times the action must be completed to
						progress the achievement.
					</p>
					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="requiredActionCount"
							render={({ field }) => (
								<FormItem className="col-span-1">
									<FormLabel size={"tiny"}>Required Count</FormLabel>
									<FormControl>
										<Input
											type="number"
											className={cn()}
											placeholder="Action Count"
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="points"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={"tiny"}>Points Awarded</FormLabel>
									<FormControl>
										<Input
											type="text"
											className={cn()}
											placeholder="Points"
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</fieldset>
				<fieldset>
					<FormField
						control={form.control}
						name="triggerId"
						render={({ field }) => (
							<FormItem>
								<FormLabel size={'tiny'}>Type of Trigger</FormLabel>
								<FormControl>
									<Select onValueChange={(v) => {
										field.onChange(Number(v));
									}} value={field.value?.toString()}>
										<SelectTrigger>
											<SelectValue placeholder="Select a trigger" />
										</SelectTrigger>
										<SelectContent>
											{AchievementTriggers.map((trigger) => (
												<SelectItem key={trigger.id} value={trigger.id.toString()}>
													{trigger.name}
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

				{form.watch("triggerId") === 3 && (
					<fieldset>
						<FormField
							control={form.control}
							name="planId"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={'tiny'}>Which Plan</FormLabel>
									<FormControl>
										{!loading && memberPlans.length > 0 ? (
											<Select onValueChange={field.onChange} value={field.value?.toString()}>
												<SelectTrigger>
													<SelectValue placeholder="Select a plan" />
												</SelectTrigger>
												<SelectContent>
													{memberPlans.map((plan) => (
														<SelectItem key={plan.id} value={plan.id}>
															{plan.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<Skeleton className='h-12 w-full' />
										)}

									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</fieldset>
				)}
				<fieldset>
					<div className="flex flex-row gap-4">
						<div className="flex-initial  mt-2">
							{badge ? (
								<div className="relative group  rounded-md  overflow-hidden size-10">
									<img
										src={badge}
										alt="badge"
										width={50}
										height={50}
										className="rounded-md"
									/>
									<div
										className={cn(
											"absolute top-0 right-0 w-full h-full flex items-center justify-center bg-red-500 text-white ",
											"cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
										)}
										onClick={() => {
											form.setValue("badge", "");
										}}
									>
										<XIcon className="size-6" />
									</div>
								</div>
							) : (
								<div className="size-10 bg-foreground/5 rounded-md flex items-center justify-center">
									<PlusIcon className="size-4 text-muted-foreground" />
								</div>
							)}
						</div>
						<FormField
							control={form.control}
							name="badge"
							render={({ field }) => (
								<FormItem>
									<FormLabel size={"tiny"}>Choose an Icon</FormLabel>
									<FormControl>
										<AchievementIcons
											value={field.value}
											handleIconChange={(icon) => {
												form.setValue("badge", icon);
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</div>
				</fieldset>
				<fieldset>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel size={"tiny"}> Description</FormLabel>
								<FormControl>
									<Textarea
										className={cn("resize-none h-20 border-foreground/10")}
										placeholder="Description"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</fieldset>




			</form>
		</Form>
	);
}
