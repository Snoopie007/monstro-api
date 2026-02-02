import {
    Button,
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogBody,
} from "@/components/ui";
import { Form, FormItem, FormLabel } from "@/components/forms";

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, LockIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { cn, StripeCardOptions } from "@/libs/utils";
import { VendorBillingSchema } from "@/libs/FormSchemas/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useVPMs } from "@/hooks";
import BillingFields from "./BillingFields";
import { useTheme } from "next-themes";



export default function AddPaymentMethod() {
    const [open, setOpen] = useState(false)
    const { mutate } = useVPMs();
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [validCard, setValidCard] = useState(false)
    const stripe = useStripe();
    const elements = useElements();
    const { resolvedTheme } = useTheme();

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

        const cardElement = elements.getElement(CardElement);

        try {
            const tokenRef = await stripe.createToken(cardElement!, { ...v });
            if (tokenRef.token) {
                const res = await fetch(`/api/protected/account/payments/new`, {
                    method: 'POST',
                    body: JSON.stringify({
                        token: tokenRef.token.id,
                    }),
                });
                setLoading(false);
                if (res.ok) {
                    mutate();
                    toast.success("Payment method added successfully.");
                    setOpen(false);
                }
            }
        } catch (error) {
            setLoading(false);
            toast.error("An error occurred while adding the payment method.");
        }
    }

    return (

        <div className="relative group" data-open={open}>
            <Button variant={"outline"} onClick={() => setOpen(true)}
                className=" group-data-[open=true]:hidden w-full border-dashed h-12 border-foreground/40 "
            >
                + Payment Method
            </Button>
            <div className="hidden  group-data-[open=true]:block">
                <Form {...form} >
                    <form className="space-y-2">
                        <fieldset>
                            <FormItem className=" ">
                                <FormLabel size="tiny">
                                    Card details
                                </FormLabel>
                                <CardElement
                                    className={'bg-foreground/5 h-12 text-base p-4 rounded-lg border border-foreground/10 '}
                                    options={{
                                        ...StripeCardOptions,
                                        hidePostalCode: true,
                                        style: {
                                            base: {
                                                color: resolvedTheme === "dark" ? "white" : "black",
                                            },
                                        },
                                    }}
                                    onChange={(e) => {
                                        setErrorMessage(
                                            e.error ? (e.error.message ? e.error.message : "An unknown error occured") : ""
                                        );
                                        setValidCard(e.complete);
                                    }}
                                />

                                <span className="flex flex-row items-center  text-muted-foreground">

                                    <span className="text-xs leading-none">
                                        This is secure 128-bit SSL encrypted payment.
                                    </span>
                                </span>
                            </FormItem>
                        </fieldset>
                        <BillingFields form={form} />
                    </form>
                    <div className="flex justify-start mt-4">
                        <Button

                            variant={"foreground"}
                            onClick={form.handleSubmit(onSubmit)}
                            size="sm"
                            type="submit"
                            disabled={!stripe || loading}
                        >
                            {loading ? <Loader2 className=" size-4 animate-spin" /> : 'Add Card'}
                        </Button>
                    </div>
                </Form>
            </div>

        </div>

    )
}
