"use client";
import { signIn, useSession } from "next-auth/react";
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

import { cn } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginSchema } from "@/libs/schemas";
import { Loader2 } from "lucide-react";


export default function LoginForm() {
	const [loading, setLoading] = useState<boolean>(false);
	const router = useRouter();
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
		try {
			const res = await signIn("credentials", { ...v, redirect: false });

			if (res?.error) {
				toast.error(res.code || 'Something went wrong. Please contact support at support@monstro.com.');
				return;
			}
			const locationId = localStorage.getItem('locationId');
			const locationRes = await fetch(`/api/auth/vendor/location`, {
				method: 'POST',
				body: JSON.stringify({ ...v, lid: locationId }),
			});
			const location = await locationRes.json();
			console.log("location", location)

			let redirect = '/onboarding';
			if (location.id && location.status) {
				localStorage.setItem('locationId', location.id);
				redirect = location.status === "incomplete" ? `/onboarding/${location.id}` : `/dashboard/${location.id}`
			}

			router.push(redirect);

		} catch (error) {
			console.error(error);
			toast.error('Something went wrong. Please contact support at support@monstro.com.');
		} finally {
			setLoading(false);
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
								<FormLabel size="tiny">
									Email
								</FormLabel>
								<FormControl>
									<Input
										type="email"
										className={"bg-white border border-gray-200 rounded-sm py-4 px-4 text-sm  "}
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
										className={"bg-white border border-gray-200  rounded-sm p-4 text-sm shadow-none"}
										placeholder="••••••••"
										{...field}
									/>
								</FormControl>

								<FormMessage className="text-xs" />
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
