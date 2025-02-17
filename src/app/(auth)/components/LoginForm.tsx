"use client";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/forms/form";
import { Input } from "@/components/forms/input";

import { cn, sleep } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast, UpdateOptions } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginSchema } from "@/libs/schemas";
import { Loader2 } from "lucide-react";


export default function LoginForm() {
	const [loading, setLoading] = useState<boolean>(false);
	const form = useForm<z.infer<typeof LoginSchema>>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onChange",
	});

	async function login(v: z.infer<typeof LoginSchema>) {
		setLoading(true);
		console.log(v)

		const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
			method: "POST",
			headers: {
				"Content-type": "application/json",
			},
			body: JSON.stringify({
				email: v.email,
				password: v.password,
			}),
		});

		await sleep(2000);
		if (res.ok) {
			const { data: user } = await res.json();
			console.log(user)
			user.customRole = user.role
			user.role = user.vendor ? "vendor" : user.member ? "member" : user.staff ? "staff" : null;
			user.vendorId = user.vendor?.id ?? 0;
			user.staffId = user.staff?.id ?? 0;
			console.log(user)
			try {
				await signIn("credentials", {
					...user,
					locations: JSON.stringify(user.locations),
					customRole: JSON.stringify(user.customRole),
					callbackUrl: `/dashboard/${user.locations.length >= 1 ? user.locations[0].id : null}`,
					redirect: true,
				})

			} catch (error) {
				const data = await res.json();

				console.error(error)
				setLoading(false);
				toast.error('Invalid email or password.');
			}
		} else {
			console.log("error");
			setLoading(false);
			toast.error('Something went wrong. Please contact support at support@monstro.com.');
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(login)} className="w-full space-y-6">
				<fieldset >
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="font-semibold text-[0.65rem] uppercase">
									Email
								</FormLabel>
								<FormControl>
									<Input
										type="email"
										className={"bg-white border border-gray-200  rounded-sm py-4 px-4 text-sm "}
										placeholder="Your email"
										{...field}
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>
				</fieldset>
				<fieldset >
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="flex flex-row justify-between">
									<span className="text-[0.65rem] font-semibold  uppercase">Password</span>
									<Link href={"/auth/forgot-password"} className={"font-semibold text-[0.65rem]  uppercase"}					>
										Forgot your password?
									</Link>

								</FormLabel>
								<FormControl>
									<Input
										type="password"
										className={"bg-white border border-gray-200  rounded-sm py-4 px-4 text-sm shadow-none"}
										placeholder="Your password"
										{...field}
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

				</fieldset>

				<div className={"flex flex-row items-center justify-between "}>
					<Button
						className={cn(
							" text-sm bg-indigo-600 w-full  text-white px-4 py-2.5 h-auto rounded-sm children:hidden",
							{ "children:inline-block": loading }
						)}
						disabled={loading || !form.formState.isValid}
						type="submit"
					>
						<Loader2 size={16} className="animate-spin mr-2" />
						Login
					</Button>


				</div>
			</form>

		</Form>
	);
}
