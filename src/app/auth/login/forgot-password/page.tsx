"use client";
import { useState } from "react";

import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

import { cn } from "@/libs/utils";

import { useForm } from "react-hook-form";
import * as z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input
} from "@/components/forms";
import { toast } from "react-toastify";
import { LucideLoader2 } from "lucide-react";
import { ForgotPasswordSchema } from "../../schema";


export default function ForgotPassword() {
    const { push } = useRouter();
    const [loading, setLoading] = useState<boolean>(false);

    const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: "",
        },
        mode: "onChange",
    });

    async function submit(v: z.infer<typeof ForgotPasswordSchema>) {
        setLoading(true);
        const res = await fetch("/api/auth/forgot", {
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
                    "shadow-xs border border-gray-100 p-6 rounded-sm"
                }
            >
                <div className={"mb-4 text-left"}>
                    <div className={"text-xl text-black font-bold mb-2"}>
                        Reset Your Password
                    </div>
                    <p className={"text-base text-gray-600"}>
                        Enter your email address below to reset your password.
                    </p>
                </div>
                <div className={""}>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submit)}>
                            <fieldset className={"mb-6 relative "}>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    className={"bg-white rounded-sm p-6 border border-gray-200 text-base shadow-none"}
                                                    placeholder="Enter your email"
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
                                        "p-4 bg-indigo-700 text-white rounded-sm children:hidden text-base ",
                                        { "children:inline-flex": loading }
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
