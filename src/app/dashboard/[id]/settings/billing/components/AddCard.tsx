'use client'

import {
    Button,
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@/components/forms"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useTheme } from "next-themes"
import { cn, StripeCardOptions } from "@/libs/utils"
import { ChevronRight, Loader2 } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible"
import { RegionSelect } from "@/components/forms"
import { AddCreditCardSchema } from "@/libs/schemas"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"

interface AddCardProps {
    locationId: string
    customerId: string
}

export default function AddCard({ locationId, customerId }: AddCardProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [validCard, setValidCard] = useState(false)
    const { theme } = useTheme();
    const stripe = useStripe();
    const elements = useElements();
    const form = useForm<z.infer<typeof AddCreditCardSchema>>({
        resolver: zodResolver(AddCreditCardSchema),
        defaultValues: {
            name: "",
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof AddCreditCardSchema>) {

        if (!elements || !stripe || !validCard) return;
        setLoading(true);

        const cardElement = elements.getElement(CardElement);

        try {
            const tokenRef = await stripe.createToken(cardElement!, { ...v });

            setLoading(false);
            if (tokenRef.token) {

                const res = await fetch(`/api/protected/${locationId}/vendor/card/add`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token: tokenRef.token.id,
                        customerId: customerId,

                    }),
                });
                if (res.ok) {
                    toast.success("Card added successfully");
                    setOpen(false);
                }
            }
        } catch (error) {
            setLoading(false);
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} size={"sm"} className="border-l rounded-none">+ Add Card</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-sm">
                <DialogHeader>
                    <DialogTitle>Add a Card</DialogTitle>
                    <DialogDescription>Add a card to management your monthly payments.</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className=" space-y-3">
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
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
                                                    color: theme === "dark" ? "#fff" : "#000",
                                                    iconColor: theme === "dark" ? "#fff" : "#000",
                                                }
                                            },
                                            hidePostalCode: true
                                        }}

                                        onChange={(e) => {
                                            setValidCard(e.complete);
                                            if (e.error) {
                                            }
                                        }}
                                    />
                                    <FormMessage />

                                </FormItem>
                            </fieldset>

                            <Collapsible >
                                <CollapsibleTrigger className="flex group flex-row items-center  text-indigo-600">
                                    <ChevronRight size={18} className="group-data-[state=open]:rotate-90" /> <span className="font-medium">More options</span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-4 bg-foreground/10 rounded-sm mt-4 space-y-2">
                                    <fieldset>
                                        <FormField
                                            control={form.control}
                                            name="address_line1"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Billing Address
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
                                </CollapsibleContent>
                            </Collapsible>



                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("children:hidden", { "children:inline-flex": loading })}
                        variant={"foreground"}
                        onClick={form.handleSubmit(onSubmit)}
                        size={"sm"}
                        type="submit"
                        disabled={!stripe || loading}
                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Add Card
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
