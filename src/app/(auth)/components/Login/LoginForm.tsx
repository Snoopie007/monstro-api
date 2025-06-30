"use client";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
} from "@/components/forms";

import { LoginSchema } from "@/libs/FormSchemas/schemas";
import { VerifyOTP, LoginFields, TypeFields } from "./";
import { useLogin } from "../../providers";

export function LoginForm() {
	const { step } = useLogin();

	const form = useForm<z.infer<typeof LoginSchema>>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			token: "",
			type: undefined,
			email: "",
			password: "",
		},
		mode: "onChange",
	});


	return (
		<div>
			<Form {...form}>
				<form className="w-full space-y-6">

					{step === 1 && <LoginFields form={form} />}
					{step === 2 && <TypeFields form={form} />}
					{step === 3 && <VerifyOTP form={form} />}
				</form>

			</Form>

		</div>
	);
}
