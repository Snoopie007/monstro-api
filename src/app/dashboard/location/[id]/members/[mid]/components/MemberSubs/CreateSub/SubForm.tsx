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

import { formatAmountForDisplay, sleep } from "@/libs/utils";
import { MemberPlan, MemberPlanPricing, MemberSubscription, PaymentMethod } from "@subtrees/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { DurationPicker } from ".";
import { useMemberStatus } from "../../../providers";
import { NewSubscriptionSchema } from "../../../schema";
import { PMSelect } from "../../PMSelect";
import { useSession } from "@/hooks/useSession";
import { clientsideApiClient } from "@/libs/api/client";

type SubFormProps = {
    lid: string
    subs: MemberPlan[]
    mid: string
    onFinish: (data: MemberSubscription) => void
}

export function SubForm({ lid, subs, mid, onFinish }: SubFormProps) {

    const [paymentType, setPaymentType] = useState<"card" | "cash">("cash");
    const { paymentMethods } = useMemberStatus()
    const { data: session } = useSession();
    const api = useMemo(() => {
        if (!session?.user?.sbToken) return null;
        return clientsideApiClient(session.user.sbToken);
    }, [session?.user?.sbToken]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [promoCode, setPromoCode] = useState("");

    const form = useForm<z.infer<typeof NewSubscriptionSchema>>({
        resolver: zodResolver(NewSubscriptionSchema),
        defaultValues: {
            startDate: new Date(),
            endDate: undefined,
            trailDays: undefined,
            memberPlanId: undefined,
            pricingId: undefined,
            allowProration: false,
        },
        mode: "onSubmit",
    })

    // Get pricing options for the selected plan
    const selectedPlanId = form.watch("memberPlanId");
    const selectedPlan = useMemo(() => {
        return subs.find(s => s.id === selectedPlanId);
    }, [subs, selectedPlanId]);

    const pricingOptions = selectedPlan?.pricingOptions || [];

    async function onSubmit(v: z.infer<typeof NewSubscriptionSchema>) {
        if (!api) {
            toast.error("Session not ready. Please try again.");
            return;
        }
        if (paymentType === "card" && !paymentMethod) {
            toast.error("Please select a payment method")
            return
        }

        try {
            const createData = await api.post(`/x/loc/${lid}/subscriptions`, {
                memberId: mid,
                pricingId: v.pricingId,
                paymentType: paymentType === "cash" ? "cash" : (paymentMethod?.type || "card"),
                startDate: v.startDate,
                endDate: v.endDate,
                trialDays: v.trailDays,
                allowProration: v.allowProration,
                promoCode: promoCode || undefined,
            }) as { subscription: MemberSubscription };

            if (paymentType === "cash") {
                await api.post(`/x/loc/${lid}/subscriptions/${createData.subscription.id}/activate-cash`, {});
            } else {
                await api.post(`/x/loc/${lid}/subscriptions/${createData.subscription.id}/activate`, {
                    paymentMethodId: paymentMethod?.id,
                    confirmNow: true,
                });
            }

            await sleep(500)
            form.reset()
            toast.success("Subscription created successfully")
            onFinish(createData.subscription)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create subscription";
            toast.error(message)
        }
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
                                        <Select onValueChange={(value) => {
                                            field.onChange(value);
                                            // Reset pricing when plan changes
                                            form.setValue("pricingId", "");
                                        }}>
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

                        {selectedPlanId && pricingOptions.length > 0 && (
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="pricingId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Select pricing option</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select pricing" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {pricingOptions.map((pricing: MemberPlanPricing) => (
                                                        <SelectItem key={pricing.id} value={pricing.id}>
                                                            {pricing.name} - {formatAmountForDisplay(pricing.price / 100, pricing.currency || 'usd')}/{pricing.interval || "one-time"}
                                                            {pricing.expireInterval && pricing.expireThreshold && 
                                                                ` (${pricing.expireThreshold} ${pricing.expireInterval} term)`
                                                            }
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        )}

                        {selectedPlanId && pricingOptions.length > 0 && (
                            <fieldset>
                                <FormLabel size="tiny">Promo Code (Optional)</FormLabel>
                                <Input
                                    placeholder="Enter promo code"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                />
                            </fieldset>
                        )}

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
