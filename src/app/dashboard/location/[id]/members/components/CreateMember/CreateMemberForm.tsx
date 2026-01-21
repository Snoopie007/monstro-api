import {
	Button,
	DialogBody,
	DialogClose,
	DialogFooter,
	Switch,
} from "@/components/ui";

import {
	Form,
	FormControl,
	FormField,
	FormMessage,
	FormItem,
	FormLabel,
	FormDescription,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	Input,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateMemberSchema } from "../../schema";
import PhoneInput from "react-phone-number-input/input";
import { CountryCodes } from "@/libs/data";
import { CountryCode, Member } from "@/types";
import { Avatar, AvatarImage } from "@/components/ui";

import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BirthdayField } from "./DOBField";
import { Loader2 } from "lucide-react";

export function CreateMemberForm({ lid }: { lid: string }) {
	const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
	const [existingMember, setExistingMember] = useState<Member | undefined>(
		undefined
	);
	const [member, setMember] = useState<Member | undefined>(undefined);
	const [loading, setLoading] = useState(false);
	const [invite, setInvite] = useState(false);
	const [retry, setRetry] = useState(false);
	const router = useRouter();



	const form = useForm<z.infer<typeof CreateMemberSchema>>({
		resolver: zodResolver(CreateMemberSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			dob: undefined,
			gender: undefined,
		},
		mode: "onSubmit",
	});

	async function onSubmit(v: z.infer<typeof CreateMemberSchema>) {
		setLoading(true);
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/members`, {
				method: "POST",
				body: JSON.stringify({
					...v,
				}),
			})
		);

		if (error || !result || !result.ok) {
			toast.error("Something went wrong. Please try again.");
			return;
		}

		const { existing, member: m } = await result.json();

		setMember(m);
		if (existing) {
			setExistingMember(m);
			setLoading(false);
			return;
		}


		if (invite) {
			await sendInvite(m);
		}
		setLoading(false);
		router.push(`/dashboard/location/${lid}/members/${m.id}`);
	}

	async function sendInvite(m: Member | undefined) {
		if (!m) return;
		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${lid}/members/${m.id}/invite`, {
				method: "POST",
			})
		);
		if (error || !result || !result.ok) {
			toast.error("Uh oh, we failed to send the invite. Please try again.");
			setRetry(true);
			return;
		}
		if (retry) {
			toast.success("Invite sent successfully.");
			router.push(`/dashboard/location/${lid}/members/${m.id}`);
		}
	}

	return (
		<>
			<DialogBody>
				<div>
					{existingMember && member && (
						<div className="space-y-3">
							<div className="space-y-1">
								<p className="text-base text-foreground font-medium">
									This member already exists.
								</p>
								<p className="text-sm text-muted-foreground">
									To add subscription or packages to this member, please go to
									the{" "}
									<Link href={`/dashboard/${lid}/members/${member?.id}`}
										className="text-indigo-400 underline"
									>
										member profile
									</Link>
								</p>
							</div>
							<div className="flex flex-row gap-4 items-center border border-indigo-500 rounded-sm px-4 py-3">
								<div>
									<Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
										<AvatarImage src={member?.user?.image || '/images/default-avatar.png'} />

									</Avatar>
								</div>
								<div className="flex flex-col ">
									<p className="text-sm font-medium leading-none">
										{member?.firstName} {member?.lastName}
									</p>
									<p className="text-xs text-muted-foreground">
										{member?.email}
									</p>
								</div>
							</div>
						</div>
					)}
					{!existingMember && (
						<Form {...form}>
							<form className="space-y-3">
								<fieldset className="flex flex-row items-center gap-2">
									<FormField
										control={form.control}
										name="firstName"
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel size="tiny">First Name</FormLabel>
												<FormControl>
													<Input
														type="text"
														placeholder="First Name"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="lastName"
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel size="tiny">Last Name</FormLabel>
												<FormControl>
													<Input
														type="text"
														placeholder="Last Name"
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
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel size="tiny">Email</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder="Email"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</fieldset>
								<fieldset >
									<FormLabel size="tiny">Phone</FormLabel>
									<div className="flex flex-row gap-1">
										<Select
											onValueChange={(value: string) => {
												setPhoneRegion(value as CountryCode);
											}}
											defaultValue={phoneRegion}
										>
											<SelectTrigger className=" w-[100px] ">
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
															className="rounded-lg bg-background inline-block w-full border px-4 h-12 border-foreground/10"
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
								<fieldset>
									<div className="flex flex-row items-start gap-3 rounded-sm border border-foreground/10 py-2 px-3 ">
										<div className="mt-1.5">
											<Switch checked={invite} onCheckedChange={setInvite} />
										</div>
										<div className="space-y-0.5">
											<FormLabel className="text-sm font-medium">
												Send Email Invite
											</FormLabel>
											<FormDescription className="text-xs">
												An email will be sent to the member to complete their
												account setup.
											</FormDescription>
										</div>
									</div>
								</fieldset>
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground uppercase ">
										Optional
									</p>
									<fieldset className="grid grid-cols-5 gap-2 bg-foreground/10 px-3 py-2 rounded-sm">
										<FormField
											control={form.control}
											name="gender"
											render={({ field }) => (
												<FormItem className="col-span-2">
													<FormLabel size="tiny">Gender</FormLabel>
													<FormControl>
														<Select
															value={field.value}
															onValueChange={field.onChange}
														>
															<SelectTrigger className="w-full py-2 px-3 ">
																<SelectValue placeholder="Gender" />
															</SelectTrigger>
															<SelectContent>
																{["Male", "Female"].map((gender, index) => (
																	<SelectItem key={index} value={gender}>
																		{gender}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="dob"
											render={({ field }) => (
												<FormItem className="col-span-3">
													<FormLabel size="tiny">Date of Birth</FormLabel>
													<BirthdayField
														value={field.value}
														onChange={field.onChange}
													/>
												</FormItem>
											)}
										/>
									</fieldset>
								</div>


							</form>
						</Form>
					)}
				</div>
			</DialogBody>
			<DialogFooter>
				<DialogClose asChild>
					<Button
						variant={"outline"}

						className="border-foreground/10"
					>
						Cancel
					</Button>
				</DialogClose>
				{!existingMember && !retry && (
					<DialogClose asChild>
						<Button
							variant={"foreground"}

							disabled={
								loading ||
								form.formState.isSubmitting ||
								!form.formState.isValid
							}
							onClick={form.handleSubmit(onSubmit)}

						>
							{loading ? <Loader2 className=" animate-spin size4" /> : "Create Account"}

						</Button>
					</DialogClose>
				)}
				{retry && (
					<Button
						variant={"continue"}
						onClick={() => sendInvite(member)}
						disabled={loading}
					>
						{loading ? <Loader2 className=" animate-spin size4" /> : "Retry"}
					</Button>
				)}
			</DialogFooter>
		</>
	);
}
