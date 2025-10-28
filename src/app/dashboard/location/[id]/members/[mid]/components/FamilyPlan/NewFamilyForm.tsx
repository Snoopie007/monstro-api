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
import { Button, DialogClose } from "@/components/ui";
import { MemberRelationship } from "@/types/DatabaseEnums";
import { cn } from "@/libs/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberPackage, MemberSubscription } from "@/types";

interface FamilyMemberFormProps {
	parentPlan: MemberSubscription | MemberPackage;
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
	parentPlan,
	reset,
}: FamilyMemberFormProps) {
	const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
	const [loading, setLoading] = useState(false);


	const form = useForm<z.infer<typeof AddFamilyMemberSchema>>({
		resolver: zodResolver(AddFamilyMemberSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			relationship: "",
			parentPlanId: parentPlan.id,
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
				relationship: v.relationship,
			};

			const response = await fetch(`/api/protected/loc/${parentPlan.locationId}/members/${parentPlan.memberId}/family`, {
				method: "POST",
				body: JSON.stringify(payload),
			});

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
		const [localPart, domain] = parentPlan.member?.email?.split("@") || [];
		const aliasEmail = `${localPart}+${firstName.toLowerCase()}@${domain}`;
		return aliasEmail;
	}

	return (
		<Form {...form}>
			<form className={cn("space-y-1   ")}>

				<fieldset>
					<FormField
						control={form.control}
						name="relationship"
						render={({ field }) => (
							<FormItem>

								<Select onValueChange={(value) => field.onChange(value)}>
									<FormControl>
										<SelectTrigger >
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
								<FormControl>
									<Input {...field} placeholder="Last Name" />
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

								<FormDescription className="text-xs text-muted-foreground">
									No email? We can create a proxy email that forwards
									messages to you. Click the button below to generate one.
								</FormDescription>
								<FormControl>
									<Input {...field} type="email" placeholder="Email" />
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
					<div className="flex flex-row gap-1">
						<Select
							onValueChange={(value: string) =>
								setPhoneRegion(value as CountryCode)
							}
							defaultValue={phoneRegion}
						>
							<SelectTrigger className=" w-[22%]">
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
											className="rounded-lg bg-background inline-block w-full border h-12 p-3 text-sm border-foreground/10"
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
				</fieldset>
				<div className="flex flex-row gap-2 mt-4" >
					<DialogClose asChild>
						<Button variant="outline" type="button" size="sm">
							Cancel
						</Button>
					</DialogClose>

					<Button className={cn("children:hidden", { "children:inline-flex": loading })}
						type="submit"
						variant={"foreground"}
						size="sm"
						disabled={loading}
						onClick={form.handleSubmit(onSubmit)}
					>
						<Loader2 className="mr-2 size-4 hidden animate-spin" />
						Add Family
					</Button>
				</div>
			</form>

		</Form>
	);
}
