'use client'
import {
    Form, FormControl,
    FormDescription,
    FormField,
    FormItem, FormLabel,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/forms';
import {
    Button,
    DialogBody,
    DialogClose,
    DialogFooter,
    Switch,
} from "@/components/ui";

import { sleep, tryCatch } from "@/libs/utils";
import { MemberPlan, MemberSubscription, PaymentMethod } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { DurationPicker } from ".";
import { useMemberStatus } from "../../../providers";
import { NewSubscriptionSchema } from "../../../schema";
import { PMSelect } from "../../PMSelect";

type SubFormProps = {
    lid: string
    subs: MemberPlan[]
    mid: string
    onFinish: (data: MemberSubscription) => void
}

export function SubForm({ lid, subs, mid, onFinish }: SubFormProps) {

    const [paymentType, setPaymentType] = useState<"card" | "cash">("cash");
    const { paymentMethods } = useMemberStatus()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

    const form = useForm<z.infer<typeof NewSubscriptionSchema>>({
        resolver: zodResolver(NewSubscriptionSchema),
        defaultValues: {
            startDate: new Date(),
            endDate: undefined,
            trailDays: undefined,
            memberPlanId: undefined,
            allowProration: false,
        },
        mode: "onSubmit",
    })

    async function onSubmit(v: z.infer<typeof NewSubscriptionSchema>) {
        if (paymentType === "card" && !paymentMethod) {
            toast.error("Please select a payment method")
            return
        }
        const path = paymentType === "card" ? "subs" : "subs/cash"

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${mid}/${path}`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    paymentMethod: paymentMethod,
                })
            })
        )

        await sleep(1000)
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

                        <fieldset className="grid grid-cols-8 gap-2">
                            <div className="col-span-3">
                                <FormLabel size="tiny">Payment Type</FormLabel>
                                <Select onValueChange={(value) => setPaymentType(value as "card" | "cash")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a payment type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="card">Credit/Debit</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-5 ">
                                <FormLabel size="tiny">Duration</FormLabel>
                                <DurationPicker
                                    onChange={(date) => {
                                        form.setValue("startDate", date.from || new Date())
                                        form.setValue("endDate", date.to)
                                    }}
                                />
                            </div>

                        </fieldset>
                        {paymentType === 'card' && (
                            <>
                                <fieldset className="grid grid-cols-6 gap-2">

                                    <div className="col-span-4">
                                        <FormLabel size="tiny">Payment Method</FormLabel>
                                        <PMSelect paymentMethods={paymentMethods || []}
                                            onChange={setPaymentMethod}
                                            value={paymentMethod?.stripeId || undefined}
                                            disabled={!form.getValues("memberPlanId")}

                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="trailDays"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel size="tiny">Trial days</FormLabel>
                                                <FormControl>
                                                    <Input disabled={!paymentMethod} type="number" placeholder="0" {...field} />
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
                                            <FormItem className="flex flex-row bg-background items-center gap-2 rounded-lg border border-foreground/10 py-2 px-3 ">

                                                <FormControl>
                                                    <Switch
                                                        disabled={!paymentMethod}
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
                    variant={"foreground"}
                    size={"sm"}
                    type="submit"
                    disabled={!form.formState.isValid || form.formState.isSubmitting}
                    onClick={form.handleSubmit(onSubmit)}
                >
                    {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Register"}
                </Button>
            </DialogFooter>
        </>
    )
}

