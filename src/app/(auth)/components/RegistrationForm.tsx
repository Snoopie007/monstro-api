"use client";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@/components/forms";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";;
import { Loader2 } from "lucide-react";
import { RegisterSchema } from "@/libs/schemas";

export function RegisterForm() {
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email");
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const form = useForm<z.infer<typeof RegisterSchema>>({

        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
        },
        mode: "onChange",
    });

    async function registerUser(v: z.infer<typeof RegisterSchema>) {

        setLoading(true);
        await sleep(1000);

        try {

            const vendor = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(v)
            })




            // const result = await signIn("credentials", {
            //     id: user.id,
            //     email: user.email,
            //     name: user.name,
            //     role: user.role,
            //     image: user.avatar,
            //     phone: user.phone,
            //     token: user.token,
            //     locations: JSON.stringify(user.locations),
            //     callbackUrl: `/dashboard/${locationId}/onboarding/${planId}/contract`,
            //     redirect: true,
            // }).then((res) => { }).catch((error) => { });

            setLoading(false);
            // router.push(`/onboarding/${locationId}`)

        } catch (error) {
            console.log("error");
            setLoading(false);
        }
    }

    return (
        <div className={"space-y-4"}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(registerUser)} className="space-y-4">
                    <fieldset className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel className="text-[0.6rem] uppercase">First Name</FormLabel>
                                <FormControl>
                                    <Input type="text" className="bg-white border border-gray-200  rounded-sm py-4 px-4 text-sm " placeholder="Your email" disabled={emailParam ? true : false} {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel className="text-[0.6rem] uppercase">Last Name</FormLabel>
                                <FormControl>
                                    <Input type="text" className="bg-white border border-gray-200  rounded-sm py-4 px-4 text-sm " placeholder="Your last name" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                    </fieldset>
                    <fieldset>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[0.6rem] uppercase">Email</FormLabel>
                                <FormControl>
                                    <Input type="email" className="bg-white border border-gray-200  rounded-sm  text-sm " placeholder="Your email" disabled={emailParam ? true : false} {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                    </fieldset>

                    <fieldset>
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[0.6rem]  uppercase">Password</FormLabel>
                                <FormControl>
                                    <Input type="password" className="bg-white border border-gray-200  rounded-sm  text-sm " placeholder="Your password" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                    </fieldset>


                </form>
            </Form>
            <div className={"space-y-1"}>
                <Button
                    className={cn("children:hidden w-full bg-indigo-600 text-white cursor-pointer ",
                        { "children:inline-block": loading })}
                    onClick={form.handleSubmit(registerUser)}
                    disabled={loading}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Create Account

                </Button>
                <p className=" text-black text-sm text-center">
                    By creating an account you agree to {" "}
                    <Link href={"#"} className={" text-indigo-700 inline-block"}>Terms of service</Link>.
                </p>
            </div>
        </div>
    );
}