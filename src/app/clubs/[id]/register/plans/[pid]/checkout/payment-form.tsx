import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/forms/input";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { cn } from "@/libs/utils";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/forms/form";

import { Loader2, LockIcon } from "lucide-react";
import { BillingSchema } from "../../../schema";



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

interface PlanBuilderPaymentProps {
    plan: any,
    programId: number,
    locationId: string
};

export default function PlanBuilderPayment({ plan, programId, locationId }: PlanBuilderPaymentProps) {
    const [errorMessage, setErrorMessage] = useState("");

    const [loading, setLoading] = useState<boolean>(false);
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    const form = useForm<z.infer<typeof BillingSchema>>({
        resolver: zodResolver(BillingSchema),
        defaultValues: {
            nameOnCard: "",
            address: "",

        },
        mode: "onChange",
    });



    async function onSubmit(v: z.infer<typeof BillingSchema>) {
        if (!elements || !stripe || !plan) return;
        setLoading(true);
        const toastRef = toast.loading("Processing payment...");
        const cardElement = elements!.getElement(CardElement);

        try {
            const tokenRef = await stripe.createToken(cardElement!);
            if (tokenRef.token) {

                const res = await fetch(`/api/auth/register/subscribe`, {
                    method: 'POST',
                    body: JSON.stringify({ plan: plan, token: tokenRef.token.id, programId: programId }),
                });


                if (!res.ok) {
                    handlePaymentError(toastRef, "An error occurred while processing your payment.");
                    return;
                }

                router.push(`/clubs/${locationId}/register/thankyou`)

            } else {
                handlePaymentError(toastRef, "Invalid Card.");
            }
        } catch (e: any) {
            console.log(e);
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <fieldset >
                    <FormField control={form.control} name="nameOnCard" render={({ field }) => (
                        <FormItem >
                            <FormLabel className="font-semibold">
                                Name on Card
                            </FormLabel>
                            <FormControl>
                                <Input variant={"register"} type="text" placeholder="Name on Card" {...field} />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </fieldset>
                <fieldset >
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">
                                Billing Address
                            </FormLabel>
                            <FormControl>
                                <Input variant={"register"} type="text" placeholder="Billing Address" {...field} />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </fieldset>

                <fieldset>
                    <FormItem className="flex-1">
                        <FormLabel className="font-semibold">
                            Card info
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

            </form>
        </Form >
    );
}
