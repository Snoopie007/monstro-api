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
    const [payment, setPayment] = useState({ status: "initial" });

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

    async function onSubmit(v: z.infer<typeof BillingSchema>) {
        if (!elements || !stripe || !plan) return;
        setPayment({ status: "processing" });

        const cardElement = elements!.getElement(CardElement);

        try {
            const tokenRef = await stripe.createToken(cardElement!);
            if (tokenRef.token) {

                const res = await fetch(`/api/auth/register/subscribe`, {
                    method: 'POST',
                    body: JSON.stringify({ plan: plan, token: tokenRef.token.id, programId: programId }),
                });


                if (!res.ok) {
                    toast.error("An error occurred while processing your payment.", {
                        position: "top-center",
                        hideProgressBar: true,
                        closeOnClick: true,
                    });
                    setPayment({ status: "error" });
                    return;
                }
                setPayment({ status: "succeeded" });
                router.push(`/clubs/${locationId}/register/thankyou`)

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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <fieldset >
                    <FormField control={form.control} name="nameOnCard" render={({ field }) => (
                        <FormItem >
                            <FormLabel className="font-semibold">
                                Name on Card
                            </FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Name on Card" {...field} />
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
                                <Input type="text" placeholder="Billing Address" {...field} />
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

                    variant={"foreground"}
                    className={cn(payment.status === "processing" && "children:inline-block")}
                    type="submit"
                    disabled={!["initial", "succeeded", "error"].includes(payment.status) || !stripe}
                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribe
                </Button>

            </form>
        </Form >
    );
}
