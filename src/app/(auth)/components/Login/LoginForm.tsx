"use client";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
} from "@/components/forms";

import { LoginSchema } from "@/libs/schemas";
import OTPFields from "./OTPFields";
import LoginFields from "./LoginFields";
import TypeFields from "./TypeFields";
import { useLoginStatus } from "../../providers/LoginStatusProvider";

export default function LoginForm() {
	const { step } = useLoginStatus();

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
					{step === 3 && <OTPFields form={form} />}
				</form>

			</Form>

		</div>
	);
}
