import React, { useEffect, useState } from "react";
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
import { MonstroLauncher, MonstroPlan } from "@/types/monstro-plan";
import { AccountCreationSchema } from "../schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@/components/forms";

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

type PlanBuilderPaymentProps = {
    plan: MonstroPlan;
    launcher: MonstroLauncher;
};

export default function PlanPayment({ launcher, plan }: PlanBuilderPaymentProps) {
    const [errorMessage, setErrorMessage] = useState("");
    const [payment, setPayment] = useState({ status: "initial" });

    const query = useSearchParams()

    const { push } = useRouter();
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



    useEffect(() => {

    }, []);
    const PaymentStatus = ({ status }: { status: string }) => {
        switch (status) {
            case "processing":
            case "requires_payment_method":
            case "requires_confirmation":
                return (
                    <>
                        <span className="loader"></span>
                        <span>processing...</span>
                    </>
                );
            case "requires_action":
                return "authenticating...";
            case "succeeded":
                return "Succeeded 🥳";
            case "error":
                return <>{errorMessage} 😭</>;
            default:
                return null;
        }
    };

    async function onSubmit(v: z.infer<typeof AccountCreationSchema>) {
        if (!elements || !stripe || !plan) return;
        setPayment({ status: "processing" });

        const cardElement = elements!.getElement(CardElement);

        const newOwner = {
            firstName: v.firstName,
            lastName: v.lastName,
            email: v.email,
            phone: v.phone
        };

        try {
            const tokenRef = await stripe.createToken(cardElement!);
            if (tokenRef.token) {

                const res = await fetch("/api/payment/custom", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        plan: plan,
                        launcher: launcher,
                        owner: newOwner,
                        token: tokenRef.token,
                        rep: query.get('rep') || "Unknown"

                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    /* GTM Tracking */
                    // window.dataLayer.push({ event: 'Started Trial' })
                    push(`/onboarding/${data.ownerID}`);
                }
            } else {
                toast.error("Invalid Card.", {
                    position: "top-center",
                    hideProgressBar: true,
                    closeOnClick: true,
                });
                setPayment({ status: "error" });
            }
        } catch (e: any) {
            console.log(e);
            toast.error("Your payment was declined by your bank, please talk to support. ",
                {
                    position: "top-center",
                    hideProgressBar: true,
                    closeOnClick: true,
                }
            );
            setPayment({ status: "error" });
        }
    }

    return (
        <motion.section
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            transition={{
                type: 'spring', bounce: 0.4, duration: 0.8
            }}
            className="px-5 sm:px-0">
            <div className="border text-base bg-white p-4 rounded-sm mb-4 mt-4 sm:mt-0 shadow-sm sm:shadow-none">
                <div className="flex flex-col gap-2">
                    <div className="flex  justify-between">
                        <div className="text-base font-semibold">
                            Launcher
                        </div>
                        <div className="text-base capitalize">
                            {launcher?.name}
                        </div>
                    </div>
                    <div className="flex  justify-between">

                        <div className="text-base font-semibold">
                            Plan
                        </div>
                        <div className="text-base capitalize">
                            {plan?.name}
                        </div>
                    </div>

                    <div className="line flex justify-between">
                        <div className="text-base font-semibold">
                            Due in {launcher?.duration} Days
                        </div>
                        <div className="text-base">
                            ${plan?.price}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="border-b my-3 border-dashed"></div>

                    <div className="flex font-bold justify-between">
                        <div className="text-base">Due Today</div>
                        <div className="text-base">${launcher?.price}</div>
                    </div>
                </div>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <fieldset>
                        <div className="flex gap-2">
                            <FormField control={form.control} name="firstName" render={({ field }) => (
                                <FormItem className="flex-1 mt-0">
                                    <FormLabel className="font-semibold">
                                        First Name*
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="text" className="bg-white" placeholder="First Name" {...field} />
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
                                            <Input type="text" className="bg-white" placeholder="Last Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">
                                        Email*
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="email" className="bg-white" placeholder="Email"  {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>
                    <fieldset>
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field: { onChange, value } }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="font-semibold">
                                        Phone*
                                    </FormLabel>
                                    <FormControl >

                                    </FormControl>

                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>

                    <fieldset>
                        <FormItem className="flex-1">
                            <FormLabel className="font-semibold">
                                Card info*
                            </FormLabel>
                            <CardElement
                                className="text-base bg-white border-2 rounded-sm border-indigo-500 py-3.5 px-3 w-full"
                                options={CARD_OPTIONS}
                                onChange={(e) => {
                                    if (e.error) {
                                        setPayment({ status: "error" });
                                        setErrorMessage(
                                            e.error.message ??
                                            "An unknown error occured"
                                        );
                                    }
                                }}
                            />
                            <FormMessage className="loaderWrp">
                                {PaymentStatus(payment)}
                            </FormMessage>
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
                            "mt-2 text-base py-3 font-semibold w-full bg-black rounded-sm hover:bg-indigo-500 children:hidden",
                            payment.status === "processing" && "children:inline-block"
                        )}
                        type="submit"
                        disabled={!["initial", "succeeded", "error"].includes(payment.status) || !stripe}
                    >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agree & Subscribe
                    </Button>
                    <p className="legal text-sm font-normal mt-2 mb-4 text-left block">
                        By subscribing to Monstro plans, you acknowledge and agree to our
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
