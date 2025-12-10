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
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Link from "next/link";
import { Loader2, Check, X } from "lucide-react";
import { RegisterSchema } from "@/libs/FormSchemas/schemas";
import PhoneInput from 'react-phone-number-input/input'
import { CountryCodes } from "@/libs/data";
import { CountryCode } from "@/types";
import { useJoin } from "../providers/JoinProvider";

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

type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";


function PasswordStrength({ password }: { password: string }) {
    const { level, feedback } = useMemo(() => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            hasLowercase: /[a-z]/.test(password),
            hasUppercase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>_\-=\[\]\\;'`~]/.test(password),
        };

        // Length scoring
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;

        // Character variety scoring
        if (checks.hasLowercase) score += 1;
        if (checks.hasUppercase) score += 1;
        if (checks.hasNumber) score += 1;
        if (checks.hasSymbol) score += 1;

        let level: PasswordStrengthLevel;
        let feedback: string;

        if (score <= 2) {
            level = "weak";
            feedback = "Weak password";
        } else if (score <= 4) {
            level = "fair";
            feedback = "Fair password";
        } else if (score <= 6) {
            level = "good";
            feedback = "Good password";
        } else {
            level = "strong";
            feedback = "Strong password";
        }

        return { level, score, feedback };
    }, [password]);




    const strengthColors = {
        weak: "bg-red-500",
        fair: "bg-orange-500",
        good: "bg-yellow-500",
        strong: "bg-green-500",
    };

    const strengthWidths = {
        weak: "w-1/4",
        fair: "w-1/2",
        good: "w-3/4",
        strong: "w-full",
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Password strength:</span>
                <span className={cn(
                    "font-medium",
                    level === "weak" && "text-red-600",
                    level === "fair" && "text-orange-600",
                    level === "good" && "text-yellow-600",
                    level === "strong" && "text-green-600"
                )}>
                    {feedback}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        strengthColors[level],
                        strengthWidths[level]
                    )}
                />
            </div>
        </div>
    );
}