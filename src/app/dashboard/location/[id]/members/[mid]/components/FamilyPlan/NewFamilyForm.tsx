"use client";

import { useState, useCallback } from "react";
import {
	Form,
	FormField,
	FormItem,
	FormControl,
	FormMessage,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Input,
	FormLabel,
} from "@/components/forms";

import { AddFamilyMemberSchema, AddFamilyMemberFormValues } from "../../schema";
import { Button, DialogClose, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";
import { cn } from "@/libs/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Info } from "lucide-react";
import { toast } from "react-toastify";
import { MemberPackage, MemberSubscription } from "@/types";
import { BirthdayField } from "../../../components/CreateMember";

interface FamilyMemberFormProps {
	parentPlan: MemberSubscription | MemberPackage;
	onClose: () => void;
}

export function FamilyMemberForm({
	parentPlan,
	onClose,
}: FamilyMemberFormProps) {
	const [loading, setLoading] = useState(false);

	const form = useForm<AddFamilyMemberFormValues>({
		resolver: zodResolver(AddFamilyMemberSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			dob: undefined,
			gender: undefined,
			parentPlanId: parentPlan.id,
		},
		mode: "onChange",
	});

	const onSubmit = useCallback(async (v: AddFamilyMemberFormValues) => {
		setLoading(true);

		try {
			const response = await fetch(
				`/api/protected/loc/${parentPlan.locationId}/members/${parentPlan.memberId}/subs/${parentPlan.id}/childs`,
				{
					method: "PATCH",
					body: JSON.stringify({
						familyMemberId: parentPlan.memberId,
						firstName: v.firstName,
						lastName: v.lastName,
						dob: v.dob,
						gender: v.gender,
					}),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to add child member");
			}
			toast.success("Child account created successfully");
			onClose();
		} catch (error) {
			console.error("Error adding child member:", error);
			toast.error("Failed to add child member");
		} finally {
			setLoading(false);
		}
	}, [parentPlan.locationId, parentPlan.memberId, parentPlan.id, onClose]);

	return (
		<Form {...form}>
			<form className={cn("space-y-3 bg-foreground/5 rounded-b-lg p-3")}>
				{/* Name Fields */}
				<fieldset className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="firstName"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-1">
									<FormLabel className="text-xs text-muted-foreground">First Name</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info className="size-3 text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent side="top">
											Email will be auto-generated based on the parent's email
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Input {...field} placeholder="First Name" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="lastName"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-xs text-muted-foreground">Last Name</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Last Name" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</fieldset>

				{/* Gender and DOB */}
				<fieldset className="grid grid-cols-5 gap-2 bg-background px-3 py-2 rounded-sm border border-foreground/10">
					<FormField
						control={form.control}
						name="gender"
						render={({ field }) => (
							<FormItem className="col-span-2">
								<FormLabel className="text-xs text-muted-foreground">Gender</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger className="w-full py-2 px-3">
											<SelectValue placeholder="Gender" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="Male">Male</SelectItem>
										<SelectItem value="Female">Female</SelectItem>
									</SelectContent>
								</Select>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="dob"
						render={({ field }) => (
							<FormItem className="col-span-3">
								<FormLabel className="text-xs text-muted-foreground">Date of Birth *</FormLabel>
								<BirthdayField value={field.value} onChange={field.onChange} />
								<FormMessage />
							</FormItem>
						)}
					/>
				</fieldset>

				{/* Action Buttons */}
				<div className="flex flex-row gap-2 mt-4 justify-end">
					<DialogClose asChild>
						<Button variant="outline" type="button" className="border-foreground/10">
							Cancel
						</Button>
					</DialogClose>

					<Button
						type="submit"
						variant="primary"
						disabled={loading}
						onClick={form.handleSubmit(onSubmit)}
					>
						{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
						Create Account
					</Button>
				</div>
			</form>
		</Form>
	);
}
