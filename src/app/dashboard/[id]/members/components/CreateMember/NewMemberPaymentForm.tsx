import {
    Button,

    Switch
} from "@/components/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription, Input } from "@/components/forms";
import { Member } from "@/types";

import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ChevronRight, Loader2 } from "lucide-react";
import { SetStateAction, Dispatch, useState } from "react";
import { useForm } from "react-hook-form";
import { cn, StripeCardOptions } from "@/libs/utils";
import { useTheme } from "next-themes";
import { AddCreditCardSchema } from "@/libs/schemas";
import { RegionSelect } from "@/components/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Stripe } from "stripe";

interface NewMemberPaymentFormProps {
    member: Partial<Member>;
    lid: string;
    setStripePayment: Dispatch<SetStateAction<Stripe.PaymentMethod | undefined>>;
}

export default function NewMemberPaymentForm({ member, lid, setStripePayment }: NewMemberPaymentFormProps) {

    const [loading, setLoading] = useState(false)
    const [validCard, setValidCard] = useState(false)
    const { theme } = useTheme();
    const stripe = useStripe();
    const elements = useElements();

    const form = useForm<z.infer<typeof AddCreditCardSchema>>({
        resolver: zodResolver(AddCreditCardSchema),
        defaultValues: {
            name: "",
            default: true,
            address_line1: "",
            address_city: "",
            address_state: "",
            address_zip: "",
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {

        if (!elements || !stripe || !validCard || !member.id || loading) return;
        setLoading(true);

        const cardElement = elements.getElement(CardElement);

        try {
            const tokenRef = await stripe.createToken(cardElement!, { ...v });


            if (tokenRef.token) {

                const res = await fetch(`/api/protected/${lid}/members/${member.id}/payments/methods`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token: tokenRef.token.id,
                        default: v.default,
                        member
                    }),
                });
                setLoading(false);
                if (res.ok) {
                    const data = await res.json()
                    console.log(data)
                    setStripePayment(data)
                    toast.success("Card added successfully", { theme: "dark" });

                }
            }
        } catch (error) {
            setLoading(false);
            toast.error("Something went wrong", { theme: "dark" });
        }
    }

    return (


        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-3">
                <fieldset>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem >
                                <FormLabel size="tiny">
                                    Cardholder Name
                                </FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="Name on card" className="border-none rounded-sm  px-3 py-2 w-full"   {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                </fieldset>

                <fieldset>
                    <FormField
                        control={form.control}
                        name="address_line1"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel size="tiny">
                                    Billing Address (Optional)
                                </FormLabel>

                                <FormControl>
                                    <Input type="text" placeholder="Billing Address" className=" border-none rounded-sm  p-3 w-full" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </fieldset>
                <fieldset className="grid grid-cols-3 items-center gap-2">
                    <FormField
                        control={form.control}
                        name="address_city"
                        render={({ field }) => (
                            <FormItem className="col-span-1">

                                <FormControl>
                                    <Input type="text" className="border-none  rounded-sm" placeholder="City" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem >
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="address_state"
                        render={({ field }) => (
                            <FormItem className="col-span-1">

                                <FormControl>
                                    <RegionSelect value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem >
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="address_zip"
                        render={({ field }) => (
                            <FormItem className="col-span-1">

                                <FormControl>
                                    <Input type="text" className="border-none rounded-sm" placeholder="Zipcode" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </fieldset>
                <fieldset>
                    <FormItem className="flex-1">
                        <FormLabel size="tiny">
                            Card Info
                        </FormLabel>
                        <CardElement
                            className=" bg-background  rounded-sm  p-3 w-full"
                            options={{
                                ...StripeCardOptions,
                                style: {
                                    base: {
                                        color: theme === "dark" || theme === "system" ? "#fff" : "#000",
                                        iconColor: theme === "dark" || theme === "system" ? "#fff" : "#000",
                                    }
                                },
                                hidePostalCode: true
                            }}
                            onChange={(e) => {
                                setValidCard(e.complete);
                            }}
                        />
                        <FormMessage />

                    </FormItem>
                </fieldset>
                <fieldset>
                    <FormField
                        control={form.control}
                        name="default"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm">
                                        Make this default payment method
                                    </FormLabel>
                                    <FormDescription className="text-xs">
                                        This will override the current subscription plan proration setting.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </fieldset>

                <div className="flex justify-end">
                    <Button type="submit" variant={"continue"} size="sm" className="" disabled={!validCard || loading}>
                        {loading ? <Loader2 className="animate-spin" /> : "Add Card"}
                    </Button>
                </div>
            </form>
        </Form>

    )
}
