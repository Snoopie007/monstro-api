import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";

import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { cn } from "@/libs/utils";
import { useSearchParams } from 'next/navigation'

import { motion } from "framer-motion";
import { Loader2, LockIcon } from "lucide-react";
import { UserSelection } from "../dummy-data";
import { AccountCreationSchema } from "../schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, SelectItem, SelectContent, SelectValue, Select, SelectTrigger } from "@/components/forms";
import { CountryCodes } from "@/libs/datas";
import { CountryCode } from "@/types";
import PhoneInput from "react-phone-number-input/input";

const CARD_OPTIONS = {
    style: {
        base: {
            fontWeight: "400",
            fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
            fontSize: "15px",
            fontSmoothing: "antialiased",
        },
        invalid: {
            iconColor: "#ef2961",
            color: "#ef2961",
        },
    },
};

export default function PlanPayment({ userSelection }: { userSelection: UserSelection }) {
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [phoneRegion, setPhoneRegion] = useState<CountryCode | undefined>("US");
    const query = useSearchParams()

    const stripe = useStripe();
    const elements = useElements();


    const form = useForm<z.infer<typeof AccountCreationSchema>>({
        resolver: zodResolver(AccountCreationSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: ""
        },
        mode: "onChange",
    });


    async function onSubmit(v: z.infer<typeof AccountCreationSchema>) {
        if (!elements || !stripe || !userSelection) return;

        setLoading(true);
        const toastRef = toast.loading("Processing payment...");
        const cardElement = elements.getElement(CardElement);

        const vendor = {
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            phone: v.phone
        };

        try {
            const tokenRef = await stripe.createToken(cardElement!);

            if (!tokenRef.token) {
                handlePaymentError(toastRef, "Invalid Card.");
                return;
            }

            const res = await fetch("/api/auth/vendor/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userSelection,
                    vendor,
                    token: tokenRef.token,
                    rep: query.get('rep') || "Unknown"
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.update(toastRef, {
                    render: "Payment successful",
                    type: "success",
                    isLoading: false,
                    autoClose: 3000,
                });
            } else {
                handlePaymentError(toastRef, "Payment failed");
            }

        } catch (error) {
            console.error(error);
            handlePaymentError(toastRef, "Your payment was declined by your bank, please talk to support.");
        }
    }

    function handlePaymentError(toastRef: string | number, message: string) {
        setLoading(false);
        toast.update(toastRef, {
            render: message,
            type: "error",
            isLoading: false,
            autoClose: 3000,
        });
    }

    return (
        <motion.section
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            transition={{
                type: 'spring', bounce: 0.4, duration: 0.8
            }}
            className="px-5 sm:px-0">
            <PlanPaymentDetails userSelection={userSelection} />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="text-black">
                    <fieldset>
                        <div className="flex  gap-2">
                            <FormField control={form.control} name="firstName" render={({ field }) => (
                                <FormItem className="flex-1 mt-0">
                                    <FormLabel className="font-semibold">
                                        First Name*
                                    </FormLabel>
                                    <FormControl>
                                        <Input variant="register" type="text" placeholder="First Name" {...field} />
                                    </FormControl>

                                    <FormMessage />
                                </FormItem>
                            )}
                            />

                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel className="font-semibold">
                                            Last Name*
                                        </FormLabel>
                                        <FormControl>
                                            <Input variant="register" type="text" placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>
                    <fieldset className="flex flex-row gap-2">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="font-semibold">
                                        Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input variant="register" type="email" placeholder="Email"  {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex-1 justify-center space-y-2">

                            <FormLabel className="font-semibold  ">
                                Phone
                            </FormLabel>
                            <div className="flex  flex-row gap-1">
                                <Select onValueChange={(value: string) => { setPhoneRegion(value as CountryCode) }} defaultValue={phoneRegion}>

                                    <SelectTrigger className={cn("border-indigo-600 border-2 text-black text-sm focus-visible:ring-0 focus-visible:outline-none py-3 h-auto rounded-sm  shadow-unique bg-white", "w-[22%] h-auto")} >
                                        <SelectValue defaultValue={""} />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {CountryCodes.map((country, index) => (
                                            <SelectItem key={index} value={country.code}>
                                                {country.code}
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
                                                    className={cn("border-indigo-600 border-2 text-black text-sm focus-visible:ring-0 focus-visible:outline-none py-3 h-auto rounded-sm  shadow-unique bg-white", "w-full px-4")}
                                                    value={value}
                                                    withCountryCallingCode={true}
                                                    international={true}
                                                    onChange={onChange}
                                                    country={phoneRegion}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </div>

                    </fieldset>

                    <fieldset>
                        <FormItem className="flex-1">
                            <FormLabel className="font-semibold">
                                Card info*
                            </FormLabel>
                            <CardElement
                                className={cn("border-indigo-600 border-2 text-black text-sm focus-visible:ring-0 focus-visible:outline-none py-3 h-auto rounded-sm  shadow-unique bg-white", "w-full px-4")}
                                options={CARD_OPTIONS}
                                onChange={(e) => {
                                    setErrorMessage(
                                        e.error ? (e.error.message ? e.error.message : "An unknown error occured") : ""
                                    );
                                }}
                            />
                            <FormMessage >{errorMessage}  </FormMessage>
                            <span className="flex flex-row items-center mt-2 text-gray-400">
                                <LockIcon size={12} className="" />
                                <span className="text-xs leading-none">
                                    This is secure 128-bit SSL encrypted payment.
                                </span>
                            </span>
                        </FormItem>
                    </fieldset>

                    <Button
                        className={cn(
                            "mt-2 text-base py-3 font-semibold w-full bg-black rounded-sm hover:bg-indigo-600 children:hidden",
                            loading && "children:inline-block"
                        )}
                        type="submit"
                        disabled={loading || !stripe}
                    >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subscribe
                    </Button>
                    <p className=" text-sm font-normal mt-2 mb-4 text-left block">
                        By subscribing to Monstro, you acknowledge and agree to our
                        <a href="https://mymonstro.com/terms-and-conditions/" className="text-sm">
                            {" "}Terms of Service
                        </a>
                        , authorize this recurring charge, and opt-in to receive additional email and SMS from Monstro.
                    </p>
                </form>
            </Form>
        </motion.section>
    );
}

function PlanPaymentDetails({ userSelection }: { userSelection: UserSelection }) {


    const total = useMemo(() => {
        if (userSelection.paymentPlan?.downPayment) {
            return userSelection.paymentPlan.downPayment - (userSelection.paymentPlan.discount || 0)
        }
        return userSelection.paymentPlan?.monthlyPayment
    }, [userSelection])

    const downPayment = useMemo(() => {
        return userSelection.paymentPlan?.downPayment! - (userSelection.paymentPlan?.discount || 0)
    }, [userSelection])

    const paymentPlan = useMemo(() => {
        if (userSelection.paymentPlan?.length === 0) {
            return "Pay in full"
        }
        return "$" + userSelection.paymentPlan?.monthlyPayment + "/mo. for " + userSelection.paymentPlan?.length + " " + userSelection.paymentPlan?.interval
    }, [userSelection])

    return (

        <div className="border space-y-2 text-black border-gray-200 text-base bg-white p-4 rounded-sm mb-4 mt-4 sm:mt-0">
            <div className="flex justify-between text-sm" >
                <div>{userSelection.plan?.name} </div>
                <div>${userSelection.plan?.price}</div>
            </div>

            <div className="flex justify-between text-sm">
                <div>Down payment</div>
                <div >${downPayment}</div>
            </div>
            <div className="flex justify-between text-sm">
                <div >Payment plan</div>
                <div>{paymentPlan}</div>
            </div>
            {/* <div className="flex justify-between text-sm">
                <div >Due after {userSelection.paymentPlan?.length} {userSelection.paymentPlan?.interval}</div>
                <div>${userSelection.addon?.price}/{userSelection.addon?.interval}</div>
            </div> */}

            <div className="border-b my-3 border-gray-200 border-dashed"></div>
            <div className="flex justify-between text-sm">
                <div  >Discount</div>
                <div className="text-red-500" >${userSelection.paymentPlan?.discount}</div>
            </div>
            <div className="flex font-semibold justify-between text-base    ">
                <div>Total Due Today</div>
                <div>${total}</div>
            </div>
        </div>
    )
}
