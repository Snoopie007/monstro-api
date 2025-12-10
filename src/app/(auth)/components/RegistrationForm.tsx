"use client";
import { useForm, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input,
    SelectContent, SelectValue, SelectTrigger, Select, SelectItem,
    Checkbox
} from "@/components/forms";
import { useSearchParams } from "next/navigation";
import { cn, sleep } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { RegisterSchema } from "@/libs/FormSchemas/schemas";
import PhoneInput from 'react-phone-number-input/input'
import { CountryCodes } from "@/libs/data";
import { CountryCode } from "@/types";
import { useJoin } from "../providers/JoinProvider";
import PasswordStrength from "./PasswordStrength";

const InputStyle = "bg-white border border-gray-200 text-base ";

export function RegisterForm() {
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email");
    const [phoneRegion, setPhoneRegion] = useState<CountryCode>("US");
    const [consented, setConsented] = useState<boolean>(false);
    const { user, setUser } = useJoin();

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

    async function checkEmail(email: string) {
        try {
            const res = await fetch("/api/auth/register/email", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                form.setError("email", { message: "Email already in use." });
            }
        } catch (error) {
            console.log(error);
        }
    }

    async function registerUser(v: z.infer<typeof RegisterSchema>) {
        if (!consented) {
            return toast.error("You must consent to the terms and conditions to create an account.");
        }
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(v),
            });
            await sleep(1000);

            if (res.ok) {
                setUser({ email: v.email, password: v.password });
            } else {
                return toast.error("Something went wrong");
            }
        } catch (error) {
            console.log(error);
            return toast.error("Something went wrong");
        }
    }

    // Fix: move the onBlur handler into the spread, not duplicating onBlur
    return (
        <div className={cn("space-y-4 w-full flex flex-col ", { hidden: user })}>
            <div className="space-y-1">
                <div className="text-2xl font-bold">
                    First, let's create your account.
                </div>
                <div className="gap-0.5">
                    <span className="text-gray-500">
                        Already have an account?{" "}
                    </span>
                    <Link
                        href={"/login"}
                        className={
                            "inline-flex  text-indigo-500  rounded-sm"
                        }
                    >
                        Login
                    </Link>
                </div>
            </div>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(registerUser)}
                    className="space-y-4"
                >
                    <fieldset className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem className="col-span-1">
                                    <FormControl>
                                        <Input
                                            type="text"
                                            className={InputStyle}
                                            placeholder="First Name"
                                            disabled={!!emailParam}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem className="col-span-1">
                                    <FormControl>
                                        <Input
                                            type="text"
                                            className={InputStyle}
                                            placeholder="Last Name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            className={InputStyle}
                                            placeholder="Email"
                                            disabled={!!emailParam}
                                            {...field}
                                            onBlur={async (e) => {
                                                if (field.value) {
                                                    await checkEmail(field.value);
                                                }
                                                // Also call RHF's onBlur if defined
                                                if (field.onBlur) {
                                                    field.onBlur();
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <div className="flex-1 justify-center space-y-2">
                            <div className="flex flex-row gap-1">
                                <Select
                                    onValueChange={(value: string) => {
                                        setPhoneRegion(value as CountryCode);
                                    }}
                                    defaultValue={phoneRegion}
                                >
                                    <SelectTrigger
                                        className={cn(
                                            InputStyle,
                                            "w-[22%]"
                                        )}
                                    >
                                        <SelectValue defaultValue={"US"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CountryCodes.map((country, index) => (
                                            <SelectItem
                                                key={index}
                                                value={country.code}
                                            >
                                                {country.shortName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({
                                        field: { onChange, value, ...rest },
                                    }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <PhoneInput
                                                    type="tel"
                                                    className={cn(
                                                        InputStyle,
                                                        "inline-block w-full  h-12 rounded-lg border  px-4"
                                                    )}
                                                    value={value}
                                                    withCountryCallingCode={true}
                                                    international={true}
                                                    country={phoneRegion}
                                                    onChange={onChange}
                                                    {...rest}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => {
                                const password = field.value || "";

                                // Define all requirements with their corresponding error messages from Zod


                                return (
                                    <FormItem className="space-y-2">
                                        <FormControl>
                                            <Input
                                                type="password"
                                                className={InputStyle}
                                                placeholder="Password"
                                                {...field}
                                            />
                                        </FormControl>

                                        {password && (
                                            <PasswordStrength password={password} />
                                        )}
                                    </FormItem>
                                );
                            }}
                        />
                    </fieldset>
                    <fieldset>
                        <div className="flex flex-row items-start space-x-3 space-y-0">
                            <Checkbox className="border-gray-300" checked={consented} onCheckedChange={(checked) => setConsented(checked === "indeterminate" ? false : checked)} />
                            <label className="leading-6 -mt-1">
                                I consent to collection and use of my personal
                                information in accordance with the{" "}
                                <Link href={"https://www.monstro-x.com/legal/term-of-use"}
                                    className={" text-indigo-500 inline-block"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Terms of service
                                </Link>{" "}
                                and{" "}
                                <Link href={"https://www.monstro-x.com/legal/privacy-policy"}
                                    className={" text-indigo-500 inline-block"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Privacy policy
                                </Link>
                                .
                            </label>
                        </div>
                    </fieldset>
                    <div className="flex ">
                        <Button
                            size="lg"

                            type="submit"
                            disabled={form.formState.isSubmitting || !form.formState.isValid || !consented}
                        >
                            {form.formState.isSubmitting ? <Loader2 className=" size-4 animate-spin" /> : "Create account"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
