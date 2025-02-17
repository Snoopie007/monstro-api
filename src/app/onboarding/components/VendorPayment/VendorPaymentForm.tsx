import { useState } from "react";

import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { cn, StripeCardOptions } from "@/libs/utils";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    RegionSelect
} from "@/components/forms";
import { Loader2, LockIcon } from "lucide-react";
import { VendorBillingSchema } from "@/libs/schemas";
import { useOnboarding } from "../../provider/OnboardingProvider";
import { Button } from "@/components/ui/button";

import { MonstroPackage, MonstroPlan } from "../ProgramSelection/dummy";





function handlePaymentError(toastRef: string | number, message: string) {
    toast.update(toastRef, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 3000,
    });
}


export default function VendorPaymentForm() {
    const { progress, updateProgress } = useOnboarding();
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState<boolean>(false);
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    const form = useForm<z.infer<typeof VendorBillingSchema>>({
        resolver: zodResolver(VendorBillingSchema),
        defaultValues: {
            name: "",
            address_line1: "",
            address_city: "",
            address_state: "",
            address_zip: "",
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof VendorBillingSchema>) {
        if (!elements || !stripe) return;
        setLoading(true);
        const toastRef = toast.loading("Processing payment...");
        const cardElement = elements!.getElement(CardElement);
        try {

            const tokenRef = await stripe.createToken(cardElement!, { ...v });

            if (tokenRef.token) {

                const res = await fetch(`/api/register/vendor/checkout/new`, {
                    method: 'POST',
                    body: JSON.stringify({
                        token: tokenRef.token,
                        plan: progress.plan,
                        pkg: progress.pkg,
                        billingInfo: v
                    }),
                });
                setLoading(false);
                if (!res.ok) {
                    return handlePaymentError(toastRef, "An error occurred while processing your payment.");

                }
                // router.push(`/onboarding/${lid}/complete`)
            } else {
                setLoading(false);
                return handlePaymentError(toastRef, "Invalid Card.");
            }
        } catch (e: any) {
            console.log(e);
            setLoading(false);
            return handlePaymentError(toastRef, "Your payment was declined by your bank, please talk to support.");
        }
    }



    return (
        <div className="space-y-3 pb-3">
            <div className="flex flex-col gap-2 bg-white border border-gray-200 rounded-sm p-4">
                <Form {...form}>
                    <form className="space-y-1">

                        <fieldset>
                            <FormField control={form.control} name="address_line1" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        Billing address</FormLabel>
                                    <FormControl>
                                        <Input type="text" className="bg-white border-gray-200 border" placeholder="Billing address" {...field} />
                                    </FormControl>

                                    <FormMessage />
                                </FormItem>
                            )} />

                        </fieldset>
                        <fieldset className="grid grid-cols-9 gap-2">
                            <FormField control={form.control} name="address_state" render={({ field }) => (
                                <FormItem className="col-span-4">
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        State
                                    </FormLabel>

                                    <FormControl>
                                        <RegionSelect value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>

                            )} />
                            <FormField control={form.control} name="address_city" render={({ field }) => (
                                <FormItem className="col-span-3">
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        City
                                    </FormLabel>

                                    <FormControl>
                                        <Input type="text" className="bg-white border-gray-200 border" placeholder="City" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="address_zip" render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        Zip
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="text" className="bg-white border-gray-200 border" placeholder="Zip" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </fieldset>

                        <fieldset >
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem >
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        Name on card
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="text" className="bg-white border-gray-200 border" placeholder="Name on card" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        </fieldset>
                        <fieldset>
                            <FormItem className=" ">
                                <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                    Card details
                                </FormLabel>
                                <CardElement
                                    className={cn("border   focus-visible:ring-0 focus-visible:outline-hidden py-2.5 h-auto rounded-sm  bg-white w-full px-4")}
                                    options={StripeCardOptions}
                                    onChange={(e) => {
                                        setErrorMessage(
                                            e.error ? (e.error.message ? e.error.message : "An unknown error occured") : ""
                                        );
                                    }}
                                />

                                <span className="flex flex-row items-center  text-gray-400">
                                    <LockIcon size={12} className="" />
                                    <span className="text-xs leading-none">
                                        This is secure 128-bit SSL encrypted payment.
                                    </span>
                                </span>
                            </FormItem>
                        </fieldset>


                    </form>
                </Form >
            </div>
            <div className="flex justify-end">
                <Button
                    size={"sm"}
                    className={cn("cursor-pointer bg-red-500 rounded-xs", {
                        "children:inline-block": loading,
                        "children:hidden": !loading
                    })}
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading || !stripe}

                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Register
                </Button>
            </div>
        </div >

    );
}


