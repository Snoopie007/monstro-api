"use client";
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
    Input
} from "@/components/forms";

import { useRouter, useSearchParams } from "next/navigation";
import { cn, sleep } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";
import { MemberRegistrationSchema } from "../schema";
import { LucideLoader2 } from "lucide-react";


export function MemberCreateAccount({ locationId }: { locationId: string }) {

    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email");
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    const form = useForm<z.infer<typeof MemberRegistrationSchema>>({
        resolver: zodResolver(MemberRegistrationSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
            phone: "",
            referralCode: ""
        },
        mode: "onChange",
    });

    async function registerUser(v: z.infer<typeof MemberRegistrationSchema>) {


        setLoading(true);

        try {
            window.localStorage.setItem("registrationDetails", JSON.stringify(v));
            await sleep(1000);
            router.push(`/clubs/${locationId}/register/plan`)
        } catch (error) {
            console.log("error");
            setLoading(false);
            toast.error("Invalid email or password.");
        }

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(registerUser)} className="space-y-2">
                <fieldset className={"flex flex-row gap-2"}>
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem className="flex-1">

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
                <fieldset >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Email
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"

                                        placeholder="Your email"
                                        disabled={emailParam ? true : false}
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
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Phone
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder="Your Phone"
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
                        name="password"
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel >
                                    Password
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"

                                        placeholder="Your password"
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
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Confirm Password
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        className={""}
                                        placeholder="Confirm your password"
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
                        name="referralCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Referral Code
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder="Enter the referral Code"
                                        {...field}
                                    />
                                </FormControl>

                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>

                <div className={"pt-2"}>
                    <Button className={cn("children:hidden rounded-sm w-full h-auto py-3 text-base", { "children:inline-block": loading })} type="submit" >
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Create Account
                    </Button>
                    <p className="mt-2 text-black/80 text-base text-center">
                        By creating an account you agree to {" "}
                        <Link href={"#"} className={" text-indigo-700 font-semibold text-base inline-block"}   >
                            Terms of service
                        </Link>.
                    </p>
                </div>

            </form>
        </Form>
    );
}