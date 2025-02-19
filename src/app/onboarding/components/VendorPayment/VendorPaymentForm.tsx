import { SetStateAction, Dispatch, useState, useEffect } from "react";

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

import { dummyContract } from "../ProgramSelection/dummy";
import { DialogTrigger, Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader, DialogFooter, DialogClose } from "@/components/ui";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MonstroPackage, MonstroPlan } from "@/types/vendor";
import { UserSelection } from "./VendorPayment";
import { useSession } from "next-auth/react";



function handlePaymentError(toastRef: string | number, message: string) {
    toast.update(toastRef, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 3000,
    });
}


export default function VendorPaymentForm({ userSelection }: { userSelection: UserSelection }) {
    const { progress, updateProgress } = useOnboarding();
    const [errorMessage, setErrorMessage] = useState("");
    const [locationId, setLocationId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const { data: session } = useSession();
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
        const toastRef = toast.loading("Processing payment...");
        const cardElement = elements!.getElement(CardElement);
        try {

            const tokenRef = await stripe.createToken(cardElement!, { ...v });

            if (tokenRef.token) {

                const res = await fetch(`/api/protected/vendor/checkout`, {
                    method: 'POST',
                    body: JSON.stringify({
                        vendorId: session?.user.vendor.id,
                        locationId: locationId,
                        token: tokenRef.token,
                        plan: userSelection.plan,
                        paymentPlan: userSelection.paymentPlan,
                        progress: progress
                    }),
                });
                setLoading(false);
                if (!res.ok) {
                    return handlePaymentError(toastRef, "An error occurred while processing your payment.");

                }
                router.push(`/dashboard/${locationId}`)
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
                <TermsAndConditions checked={progress.agreedToTerms}
                    setChecked={(checked) =>
                        updateProgress({
                            ...progress,
                            agreedToTerms: checked
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
                    disabled={loading || !stripe || !form.formState.isValid || !progress.agreedToTerms}

                >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Register
                </Button>
            </div>
        </div >

    );
}


interface TermsAndConditionsProps {
    checked: boolean;
    setChecked: (checked: boolean) => void;
}

function TermsAndConditions({ checked, setChecked }: TermsAndConditionsProps) {
    const [scrolled, setScrolled] = useState(false);

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        const element = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
        if (!element) return;
        const { scrollTop, scrollHeight, clientHeight } = element;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100;
        if (scrollPercentage >= 90) {
            setScrolled(true);
        }
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="items-center relative bg-gray-50 flex space-x-1 border group border-gray-200 px-2 py-2.5 rounded-sm cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="group" data-checked={checked}>
                        <rect x="1" y="1" width="14" height="14" rx="2" strokeWidth="1.5" className="stroke-gray-600" />
                        <path d="M12 5L6.5 10.5L4 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={cn("stroke-gray-600 opacity-0 ",
                                " group-data-[checked=true]:opacity-100 "
                            )} />
                    </svg>
                    <p className="text-xs leading-none">
                        You have read and agree to our <span className="text-red-500">Terms of Service</span> and <span className="text-red-500">Privacy Policy</span>.
                    </p>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] space-y-4 py-4 border-foreground/10">
                <DialogHeader className="hidden">
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 space-y-1 ">
                    <p className="font-semibold  text-base px-4">Monstro <span className="text-red-500">Terms of Service</span></p>
                    <ScrollArea className="h-[500px] px-4 border-y border-foreground/10" onScrollCapture={handleScroll}>
                        <div className='prose pb-4   text-foreground prose-strong:text-foreground prose-headings:my-4 prose-h2:text-2xl prose-sm max-w-full prose-p:font-roboto prose-p:leading-6'
                            dangerouslySetInnerHTML={{ '__html': dummyContract }}>
                        </div>
                    </ScrollArea>

                </div>
                <DialogFooter className="px-4 py-0">
                    <DialogClose asChild>
                        <Button variant={"outline"} onClick={() => setChecked(false)} size={"xs"} className="hover:bg-transparent cursor-pointer">
                            Decline
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            disabled={!scrolled}
                            onClick={() => setChecked(true)}
                            size={"xs"}
                            className="bg-red-500 hover:bg-red-600 cursor-pointer"
                        >
                            Accept
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
