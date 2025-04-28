import { useState, useEffect } from "react";

import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { cn, sleep, StripeCardOptions } from "@/libs/utils";
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
import { VendorBillingSchema } from "@/libs/FormSchemas/schemas";
import { useNewLocation } from "../../provider/NewLocationContext";
import { Button } from "@/components/ui/button";

import { useSession } from "next-auth/react";
import { decodeId } from "@/libs/server/sqids";
import { TermsAndConditions } from "@/components/terms";



function handlePaymentError(toastRef: string | number, message: string) {
    toast.update(toastRef, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 1000,
    });
}


export default function VendorPaymentForm() {
    const { locationState, updateLocationState, tos } = useNewLocation();
    const [errorMessage, setErrorMessage] = useState("");
    const [locationId, setLocationId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [validCard, setValidCard] = useState<boolean>(false);
    const { data: session, update } = useSession();
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();

    useEffect(() => {

        if (session?.user.locations[0]) {

            setLocationId(session.user.locations[0].id);
        }
    }, [session])

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

        if (!elements || !stripe || !locationId) return;
        setLoading(true);
        const toastRef = toast.loading("Processing payment...", { className: 'text-sm font-medium ' });


        const cardElement = elements!.getElement(CardElement);
        try {

            const tokenRef = await stripe.createToken(cardElement!, { ...v });

            if (tokenRef.token) {

                const res = await fetch(`/api/protected/vendor/locations/${locationId}/checkout`, {
                    method: 'POST',
                    body: JSON.stringify({
                        vendorId: session?.user.vendorId,
                        locationId: locationId,
                        token: tokenRef.token,
                        state: locationState
                    }),
                });
                setLoading(false);
                if (!res.ok) {
                    return handlePaymentError(toastRef, "An error occurred while processing your payment.");
                }

                await update({
                    locations: session?.user.locations.map((location: { id: string, status: string }) => {
                        const decodedId = decodeId(location.id);
                        return decodedId === locationState.locationId
                            ? { ...location, status: 'active' }
                            : location
                    })
                });
                toast.update(toastRef, {
                    render: "Payment successful",
                    type: "success",
                    isLoading: false,
                    autoClose: 100
                });
                await sleep(100)
                router.push(`/dashboard/location/${locationId}`)
            } else {
                setLoading(false);
                return handlePaymentError(toastRef, "Invalid Card.");
            }
        } catch (e: unknown) {
            console.log(e);
            setLoading(false);
            return handlePaymentError(toastRef, "Your payment was declined by your bank, please talk to support.");
        }
    }



    return (
        <div className="space-y-3 pb-3 ">
            <div className="flex flex-col gap-2 bg-white border border-gray-200 rounded-sm p-4 pb-6 space-y-3 shadow-xs">
                <Form {...form}>
                    <form className="space-y-1">

                        <fieldset>
                            <FormField control={form.control} name="address_line1" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[0.58rem] uppercase font-semibold">
                                        Billing addres
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="text" className="bg-white  border-gray-200 border" placeholder="Billing address" {...field} />
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
                                        <RegionSelect value={field.value} onChange={field.onChange} className="bg-white text-black" />
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
                                        <Input type="text" className="bg-white text-black border-gray-200 border" placeholder="City" {...field} />
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
                                        <Input type="text" className="bg-white text-black autofill:text-black border-gray-200 border" placeholder="Zip" {...field} />
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
                                        <Input type="text" className="bg-white text-black border-gray-200 border" placeholder="Name on card" {...field} />
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


                    </form>
                </Form >
                <TermsAndConditions checked={locationState.agreeToTerms}
                    tos={tos}
                    setChecked={(checked) =>
                        updateLocationState({
                            ...locationState,
                            agreeToTerms: checked
                        })
                    }
                />
            </div>
            <div className="flex justify-end">
                <Button
                    size={"sm"}
                    className={cn("cursor-pointer bg-red-500 rounded-xs", {
                        "children:inline-block": loading,
                        "children:hidden": !loading
                    })}
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading || !form.formState.isValid || !locationState.agreeToTerms || !validCard}

                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Register
                </Button>
            </div>
        </div >

    );
}

