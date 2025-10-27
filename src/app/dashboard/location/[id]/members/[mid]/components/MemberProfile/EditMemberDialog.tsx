"use client";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogBody,
	Button,
	DialogClose,
} from "@/components/ui";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { tryCatch, cn } from "@/libs/utils";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useMemberStatus } from "../../providers";
import { MemberLocationProfile } from "@/types";
import { MemberInfoSchema } from "../../schema";


interface Props {
	params: { id: string; mid: string };
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
}

export default function EditMemberDialog({ params, open, setOpen }: Props) {

	const [loading, setLoading] = useState(false);
	const { member, ml, updateMemberLocation } = useMemberStatus();

	const memberProfile = ml?.profile || member;

	const form = useForm<z.infer<typeof MemberInfoSchema>>({
		resolver: zodResolver(MemberInfoSchema),
		defaultValues: {
			firstName: memberProfile?.firstName || "",
			lastName: memberProfile?.lastName || "",
			email: memberProfile?.email || "",
			phone: memberProfile?.phone || "",
			avatar: memberProfile?.avatar || "",
		},
	});


	useEffect(() => {
		if (open) {
			form.reset();
		}
	}, [open]);

	async function onSubmit(values: z.infer<typeof MemberInfoSchema>) {
		setLoading(true);

		const { result, error } = await tryCatch(
			fetch(`/api/protected/loc/${params.id}/members/${params.mid}/info`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(values),
			})
		);

		setLoading(false);

		if (result?.status === 403) {
			toast.error("You are not authorized to edit this member");
			return;
		}

		if (error || !result || !result.ok) {
			toast.error("Failed to update member information");
			return;
		}

		// Update the member location profile in context with the new values
		updateMemberLocation((prev) => ({
			...prev,
			profile: {
				...prev.profile,
				...values,
			} as MemberLocationProfile,
		}));

		toast.success("Member information updated successfully");
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>

			<DialogContent className="max-w-md rounded-sm border-foreground/10">
				<DialogHeader>
					<DialogTitle>Edit Member</DialogTitle>
				</DialogHeader>

				<DialogBody>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>First Name</FormLabel>
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
											<FormLabel>Last Name</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input type="email" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Phone</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>


						</form>
					</Form>


				</DialogBody>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">
							Cancel
						</Button>
					</DialogClose>
					<Button
						disabled={loading}
						onClick={form.handleSubmit(onSubmit)}
					>
						{loading && <Loader2 className="mr-2 size-4 animate-spin" />}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
