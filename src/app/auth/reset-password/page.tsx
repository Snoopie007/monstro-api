"use client";
import { useState, use } from "react";

import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

import { cn, sleep } from "@/libs/utils";

import { useForm } from "react-hook-form";
import * as z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/forms/form";
import { Input } from "@/components/forms";
import { toast } from "react-toastify";
import { ResetPasswordSchema } from "../schema";
import { LucideLoader2 } from "lucide-react";
const InputStyle =
    "bg-white rounded-sm p-6 border border-gray-200 text-black shadow-none";

export default function ResetPassword(props: { searchParams: Promise<{ token: string, email: string }> }) {
    const searchParams = use(props.searchParams);
    const { push } = useRouter();
    const [loading, setLoading] = useState<boolean>(false);

    if (!searchParams.email || !searchParams.token) {
        push('/login');
    }
    const form = useForm<z.infer<typeof ResetPasswordSchema>>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            password: "",
            email: searchParams.email,
            token: searchParams.token,
            password_confirmation: ""
        },
        mode: "onChange",
    });

    async function submit(v: z.infer<typeof ResetPasswordSchema>) {
        setLoading(true);
        const res = await fetch("/api/auth/reset-password", {
            method: "post",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                ...v,
            }),
        });
        console.log(res)
        // await sleep(2000);
        setLoading(false);

        if (!res.ok) {
            const { message } = await res.json();
            return toast.error(message);
        }
        // push(`/auth/update-password?token=${token}&expires=${expireTime}`)
        push('/login');
    }

    return (
        <div className={"py-36 max-w-lg m-auto bg-white"}>
            <div
                className={
                    "shadow-sm border border-gray-200 px-6 py-12 rounded-sm"
                }
            >
                <div className={"mb-8 text-center"}>
                    <div className={"text-2xl text-black font-bold mb-4"}>
                        Reset Your Password
                    </div>
                    <p className={"text-lg text-gray-600"}>
                        Enter your password.
                    </p>
                </div>
                <div className={"mb-10 t"}>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)}>
                            <input type="hidden" value={searchParams.email} name="email" />
                            <input type="hidden" value={searchParams.token} name="token" />
                            <fieldset className={"mb-6 relative "}>
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    className={InputStyle}
                                                    placeholder="Enter your password"
                                                    {...field}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className={"mb-6 relative "}>
                                <FormField
                                    control={form.control}
                                    name="password_confirmation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    className={InputStyle}
                                                    placeholder="Confirm your password"
                                                    {...field}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <div className={"flex flex-row items-center justify-end "}>
                                <Button
                                    className={cn(
                                        "p-5 bg-black text-white rounded-sm children:hidden text-base ",
                                        loading && "children:inline-flex"
                                    )}
                                    disabled={false}
                                >
                                    <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Next
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
