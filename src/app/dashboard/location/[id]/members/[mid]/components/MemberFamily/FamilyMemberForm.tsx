"use client";

import React, { useEffect, useState } from "react";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Input,
	FormDescription,
} from "@/components/forms";

import { AddFamilyMemberSchema } from "../../schema";
import { z } from "zod";
import { CountryCode } from "@/types/other";
import { CountryCodes } from "@/libs/data";
import PhoneInput from "react-phone-number-input/input";
import { FamilyPlan, Member } from "@/types/member";
import { Button, DialogBody, DialogFooter } from "@/components/ui";
import { MemberRelationship } from "@/types/DatabaseEnums";
import { cn } from "@/libs/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface FamilyMemberFormProps {
	familyMember: Member | null;
	familyPlans: FamilyPlan[];
	parent: Member;
	lid: string;
	reset: () => void;
}
const RelationshipOptions: MemberRelationship[] = [
	"parent",
	"spouse",
	"child",
	"sibling",
	"other",
];

export function FamilyMemberForm({
	familyMember,
	familyPlans,
	parent,
	lid,
	reset,
}: FamilyMemberFormProps) {
	const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (familyMember) {
			form.reset({
				firstName: familyMember.firstName,
				lastName: familyMember.lastName || "",
				email: familyMember.email,
				phone: familyMember.phone || "",
				familyMemberId: parent.id,
			});
		}
	}, [familyMember]);

	const form = useForm<z.infer<typeof AddFamilyMemberSchema>>({
		resolver: zodResolver(AddFamilyMemberSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			relationship: "",
			familyPlanId: "",
			familyMemberId: parent.id,
		},
		mode: "onChange",
	});

	async function onSubmit(v: z.infer<typeof AddFamilyMemberSchema>) {
		setLoading(true);

		try {
			const payload = {
				firstName: v.firstName,
				lastName: v.lastName,
				email: v.email,
				phone: v.phone,
				familyMemberId: parent.id,
				relationship: v.relationship,
				familyPlanId: v.familyPlanId,
			};

			const response = await fetch(
				`/api/protected/loc/${lid}/members/${parent.id}/family`,
				{
					method: "POST",
					body: JSON.stringify(payload),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to add child member");
			}
			reset();
		} catch (error) {
			console.error("Error adding child member:", error);
		} finally {
			setLoading(false);
		}
	}

	function useAliasEmail() {
		const firstName = form.getValues("firstName");
		if (!firstName) {
			toast.error("First name is required");
			return "";
		}
		const [localPart, domain] = parent.email.split("@");
		const aliasEmail = `${localPart}+${firstName.toLowerCase()}@${domain}`;
		return aliasEmail;
	}

	return (
		<>
			<DialogBody>
				<div className="flex flex-col gap-2">
					<Form {...form}>
						<form className={cn("space-y-1   rounded-sm ")}>
							<input type="hidden" value={parent.id} name="familyMemberId" />

							<fieldset>
								<FormField
									control={form.control}
									name="familyPlanId"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Select a Family Plan</FormLabel>
											<Select onValueChange={(value) => field.onChange(value)}>
												<FormControl>
													<SelectTrigger className="rounded-xs">
														<SelectValue placeholder="Select a family plan" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{familyPlans.map((plan: FamilyPlan) => (
														<SelectItem
															key={plan.planId}
															value={plan.planId.toString()}
														>
															{plan.planName} {plan.planId}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>
							<fieldset>
								<FormField
									control={form.control}
									name="relationship"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Select a relationship</FormLabel>
											<Select onValueChange={(value) => field.onChange(value)}>
												<FormControl>
													<SelectTrigger className="rounded-xs">
														<SelectValue placeholder="Select a relationship" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{RelationshipOptions.map(
														(relation: MemberRelationship, i) => (
															<SelectItem key={i} value={relation}>
																{relation}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>

							<fieldset className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">First Name</FormLabel>
											<FormControl>
												<Input {...field} />
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
											<FormLabel size="tiny">Last Name</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>
							<fieldset className="space-y-1">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel size="tiny">Email </FormLabel>
											<FormDescription className="text-xs text-muted-foreground">
												No email? We can create a proxy email that forwards
												messages to you. Click the button below to generate one.
											</FormDescription>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div
									className="text-red-500 text-xs  font-medium cursor-pointer"
									onClick={() => {
										form.setValue("email", useAliasEmail());
									}}
								>
									(Generate Proxy Email)
								</div>
							</fieldset>
							<fieldset>
								<div className="flex-1 justify-center space-y-2">
									<FormLabel size="tiny">Phone</FormLabel>
									<div className="flex flex-row gap-1">
										<Select
											onValueChange={(value: string) =>
												setPhoneRegion(value as CountryCode)
											}
											defaultValue={phoneRegion}
										>
											<SelectTrigger className="rounded-sm w-[22%] h-auto">
												<SelectValue defaultValue={"US"} />
											</SelectTrigger>
											<SelectContent>
												{CountryCodes.map((country, index) => (
													<SelectItem key={index} value={country.code}>
														{country.shortName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormField
											control={form.control}
											name="phone"
											render={({ field: { onChange, value } }) => (
												<FormItem className="flex-1">
													<FormControl>
														<PhoneInput
															type="tel"
															className="rounded-sm bg-background inline-block w-full border py-1.5 px-4"
															value={value}
															withCountryCallingCode={true}
															international={true}
															country={phoneRegion}
															onChange={onChange}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>
							</fieldset>
						</form>
					</Form>
				</div>
			</DialogBody>
			<DialogFooter>
				<Button
					variant="outline"
					onClick={() => {
						form.reset();
						reset();
					}}
				>
					Cancel
				</Button>

				<Button
					className={cn("children:hidden", { "children:inline-flex": loading })}
					variant={"foreground"}

					type="submit"
					disabled={loading}
					onClick={form.handleSubmit(onSubmit)}
				>
					<Loader2 className="mr-2 size-4 hidden animate-spin" />
					Add Family
				</Button>
			</DialogFooter>
		</>
	);
}
