'use client'
import {
    Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    Switch,
} from "@/components/ui";
import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    FormDescription,
} from '@/components/forms';

import { SetStateAction, Dispatch, useEffect, useState } from "react";
import { NewSubscriptionSchema } from "../../../schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { useMemberPaymentMethods, useMemberStatus } from "../../../providers";
import React from "react";
import { MemberPlan, MemberSubscription } from "@/types";
import { Stripe } from "stripe";
import { DurationPicker } from ".";
import { toast } from "react-toastify";

type SubFormProps = {
    lid: string
    subs: MemberPlan[]
    mid: string
    onFinish: (data: MemberSubscription) => void
}

export function SubForm({ lid, subs, mid, onFinish }: SubFormProps) {

    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()

    const [stripePaymentMethod, setStripePaymentMethod] = useState<Stripe.PaymentMethod | null>(null);


    const form = useForm<z.infer<typeof NewSubscriptionSchema>>({
        resolver: zodResolver(NewSubscriptionSchema),
        defaultValues: {
            startDate: new Date(),
            endDate: undefined,
            trailDays: undefined,
            paymentMethod: undefined,
            memberPlanId: undefined,
            allowProration: false,
            other: {
                cardId: undefined,
            },
        },
        mode: "onSubmit",
    })


    const paymentMethod = form.watch("paymentMethod")
    async function onSubmit(v: z.infer<typeof NewSubscriptionSchema>) {

        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${mid}/subscriptions`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    stripePaymentMethod
                })
            })
        )
        await sleep(1000)
        setLoading(false)
        if (error || !result || !result?.ok) return;


        form.reset()
        const data = await result.json()
        toast.success("Subscription created successfully")
        onFinish(data)
    }



    return (
        <>
            <DialogBody >
                <Form {...form}>
                    <form className='space-y-1' >


                        <fieldset >
                            <FormField
                                control={form.control}
                                name="memberPlanId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Select a plan</FormLabel>
                                        <Select onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger >
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {subs && subs.map((sub: MemberPlan, index: number) => (
                                                    (sub.id) ?
                                                        <SelectItem key={index} value={sub.id?.toString()}>{sub.name}</SelectItem> : null
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem className="">
                                        <FormLabel size="tiny">Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.getValues("memberPlanId")}>
                                            <SelectTrigger className="capitalize">
                                                <SelectValue placeholder="Select a payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['card', "cash"].map((method) => (
                                                    <SelectItem key={method} value={method.toLowerCase()} className="capitalize">
                                                        {method}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>

                        <fieldset >

                            <div className="col-span-4 flex flex-col gap-1.5">
                                <FormLabel size="tiny">Duration</FormLabel>
                                <DurationPicker
                                    onChange={(date) => {
                                        form.setValue("startDate", date.from || new Date())
                                        form.setValue("endDate", date.to)
                                    }}
                                />
                            </div>

                        </fieldset>
                        {paymentMethod === "card" && (
                            <>
                                <fieldset className="grid grid-cols-6 gap-2">

                                    <FormField
                                        control={form.control}
                                        name="other.cardId"
                                        render={({ field }) => (
                                            <FormItem className="col-span-4">
                                                <FormLabel size="tiny">Select a Card</FormLabel>
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value)

                                                    setStripePaymentMethod(paymentMethods.find((method) => method.id === value) || null)
                                                }} defaultValue={field.value} >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a payment method" />

                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {paymentMethods.map((method, index) => (
                                                            <React.Fragment key={index}>
                                                                {method.card ? (
                                                                    <SelectItem value={method.id} className="w-full">
                                                                        <div className="flex flex-row items-center justify-between gap-4">
                                                                            <div className="flex flex-row items-center gap-2">
                                                                                <img src={`/images/cards/${method.card.brand}.svg`} alt={method.card.brand} className="h-7 w-7" />

                                                                                <span className="text-sm capitalize">{method.card.brand} •••• {method.card.last4}</span>
                                                                            </div>
                                                                            <span className="text-sm">{method.card.exp_month} / {method.card.exp_year}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ) : null}
                                                            </React.Fragment>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="trailDays"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel size="tiny">Trial days</FormLabel>
                                                <FormControl>
                                                    <Input disabled={paymentMethod !== "card"} type="number" placeholder="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>

                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="allowProration"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row bg-background items-center gap-2 rounded-sm border border-foreground/10 py-2 px-3 ">

                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-sm">
                                                        Allow proration
                                                    </FormLabel>
                                                    <FormDescription className="text-xs">
                                                        This will override the current subscription plan proration setting.
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            </>
                        )}
                    </form>
                </Form>
            </DialogBody>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" size={"sm"} className="border-foreground/10">Cancel</Button>
                </DialogClose>
                <Button
                    className={cn("children:hidden", loading && "children:block")}
                    variant={"foreground"}
                    size={"sm"}
                    type="submit"
                    disabled={loading || !form.formState.isValid}
                    onClick={form.handleSubmit(onSubmit)}
                >
                    <Loader2 className="mr-2 h-4 w-4  animate-spin" />
                    Continue
                </Button>
            </DialogFooter>
        </>
    )


}