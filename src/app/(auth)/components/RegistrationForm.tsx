"use client";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input,
    SelectContent, SelectValue, SelectTrigger, Select, SelectItem
} from "@/components/forms";
import { useSearchParams } from "next/navigation";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";;
import { Loader2 } from "lucide-react";
import { RegisterSchema } from "@/libs/schemas";
import PhoneInput from 'react-phone-number-input/input'
import { CountryCodes } from "@/libs/data";
import { CountryCode } from "@/types";
import { signIn } from "next-auth/react";


export function RegisterForm() {
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email");
    const [loading, setLoading] = useState<boolean>(false);
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");

    const form = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            phone: "",
        },
        mode: "onChange",
    });

    async function registerUser(v: z.infer<typeof RegisterSchema>) {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/vendor/register", {
                method: "POST",
                body: JSON.stringify(v)
            })
            await sleep(1000);
            setLoading(false);

            if (!res.ok) {
                return toast.error("Something went wrong");
            }

            await signIn("credentials", {
                ...v,
                redirect: true,
                callbackUrl: "/onboarding"
            })
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong");
        }
    }

    return (
        <div className={"space-y-4"}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(registerUser)} className="space-y-4">
                    <fieldset className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel className="text-[0.6rem] uppercase">
                                    First Name
                                </FormLabel>
                                <FormControl>
                                    <Input type="text" className="bg-white border border-gray-200  rounded-sm py-4 px-4 text-sm " placeholder="Your email" disabled={emailParam ? true : false} {...field} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem className="col-span-1">
                                <FormLabel className="text-[0.6rem] uppercase">
                                    Last Name
                                </FormLabel>
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
                        <div className="flex-1 justify-center space-y-2">

                            <FormLabel className="text-[0.6rem] uppercase"> Phone </FormLabel>
                            <div className="flex  flex-row gap-1">
                                <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>

                                    <SelectTrigger className="rounded-sm w-[22%] h-auto bg-white border border-gray-200" >
                                        <SelectValue defaultValue={'US'} />
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
                                            <FormControl >
                                                <PhoneInput
                                                    type="tel"
                                                    className="rounded-sm bg-transparent inline-block w-full border py-1.5 px-4"
                                                    value={value}
                                                    withCountryCallingCode={true}
                                                    international={true}
                                                    country={phoneRegion}
                                                    onChange={onChange}
                                                />
                                            </FormControl>

                                        </FormItem>
                                    )}
                                />

                            </div>

                        </div>

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
                    className={cn("children:hidden w-full bg-indigo-600 text-white cursor-pointer  rounded-sm",
                        { "children:inline-block": loading })}
                    onClick={form.handleSubmit(registerUser)}
                    disabled={loading}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Create Account

                </Button>
                <p className=" text-black text-sm text-center">
                    By creating an account you agree to {" "}
                    <Link href={"https://www.mymonstro.com/legal/term-of-use"} className={" text-indigo-700 inline-block"} target="_blank">
                        Terms of service
                    </Link> and {" "}
                    <Link href={"https://www.mymonstro.com/legal/privacy-policy"} className={" text-indigo-700 inline-block"} target="_blank">
                        Privacy policy
                    </Link>.
                </p>
            </div>
        </div>
    );
}