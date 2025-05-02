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
import { PaymentMethod } from "@stripe/stripe-js";
import { useVendorPaymentMethods } from "@/hooks";
import BillingFields from "./BillingFields";



export default function AddPaymentMethod() {
    const [open, setOpen] = useState(false)
    const { mutate } = useVendorPaymentMethods();
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [validCard, setValidCard] = useState(false)
    const stripe = useStripe();
    const elements = useElements();

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
                const res = await fetch(`/api/protected/vendor/payment/methods/new`, {
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
            <div className="cursor-pointer group-data-[open=true]:hidden text-sm border-dashed border-gray-300 rounded-sm p-2 border text-center"
                onClick={() => setOpen(true)}
            >
                + Payment Method
            </div>
            <div className="hidden bg-white pt-2 px-4 pb-4 rounded-sm border group-data-[open=true]:block">
                <Form {...form} >
                    <form>
                        <fieldset>
                            <FormItem className=" ">
                                <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                    Card details
                                </FormLabel>
                                <CardElement
                                    className={cn("border   focus-visible:ring-0 focus-visible:outline-hidden py-2.5 h-auto rounded-sm  bg-white w-full px-4")}
                                    options={{
                                        ...StripeCardOptions,
                                        hidePostalCode: true
                                    }}
                                    onChange={(e) => {
                                        setErrorMessage(
                                            e.error ? (e.error.message ? e.error.message : "An unknown error occured") : ""
                                        );
                                        setValidCard(e.complete);
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
                        <BillingFields form={form} />
                    </form>
                    <div className="flex justify-end mt-2">
                        <Button
                            className={cn("children:hidden rounded-t-none w-full", { "children:inline-flex": loading })}
                            variant={"foreground"}
                            onClick={form.handleSubmit(onSubmit)}
                            size={"sm"}
                            type="submit"
                            disabled={!stripe || loading}
                        >
                            <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                            Add Card
                        </Button>
                    </div>
                </Form>
            </div>

        </div>

    )
}
