import {
    Button,
    DialogBody,
    DialogFooter,
    DialogClose,
    Popover,
    PopoverContent,
    Calendar,
    PopoverTrigger,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui";
import {
    Form,
    FormControl,
    FormField,
    FormMessage,
    FormItem,
    FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
    FormDescription,
} from '@/components/forms';

import { SetStateAction, Dispatch, useState } from "react";
import { NewPackageSchema } from "../../../schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon, ChevronRight } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useMemberPaymentMethods, useMemberStatus } from "../../../providers/MemberContext";
import React from "react";
import { MemberPlan } from "@/types";
import { Stripe } from "stripe";
import { toast } from "react-toastify";
import { useMemberPackages, usePackages } from "@/hooks";
import { SubPackageProgress } from "../../SessionForm";

interface PkgFormProps {
    params: { id: string, mid: number },
    progress: SubPackageProgress,
    setProgress: Dispatch<SetStateAction<SubPackageProgress>>
}

export function PkgForm({ params, progress, setProgress }: PkgFormProps) {
    const { mutate } = useMemberPackages(params.id, params.mid)
    const { ml } = useMemberStatus()
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()
    const [stripePaymentMethod, setStripePaymentMethod] = useState<Stripe.PaymentMethod | null>(null);
    const { packages } = usePackages(params.id)

    const form = useForm<z.infer<typeof NewPackageSchema>>({
        resolver: zodResolver(NewPackageSchema),
        defaultValues: {
            startDate: new Date(),
            expireDate: undefined,
            paymentMethod: undefined,
            memberPlanId: undefined,
            totalClassLimit: undefined,
            other: {
                cardId: undefined,
            }
        },
        mode: "onSubmit",
    })



    const paymentType = form.watch("paymentMethod")

    async function onSubmit(v: z.infer<typeof NewPackageSchema>) {
        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/members/${params.mid}/packages`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    stripePaymentMethod: stripePaymentMethod,
                    hasIncompletePlan: ml.status === "incomplete"
                })
            })
        )
        setLoading(false)
        if (error || !result?.ok) return;

        form.reset()
        mutate()
        toast.success("Package created successfully")
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
                                        <FormLabel size="tiny">Select a Plan</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(Number(value))} >
                                            <FormControl>
                                                <SelectTrigger className="rounded-sm">
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {packages && packages.map((pkg: MemberPlan, index: number) => (
                                                    (pkg.id) ? <SelectItem key={index} value={pkg.id?.toString()}>{pkg.name}</SelectItem> : null
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>

                        <fieldset className="grid grid-cols-6 gap-2 ">
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem className="col-span-2 ">
                                        <FormLabel size="tiny">Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.getValues("memberPlanId")} >
                                            <SelectTrigger className="rounded-sm capitalize" >
                                                <SelectValue placeholder="Select a payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['card', "cash", "zelle", "bank payment", "cheque"].map((method) => (
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
                            <FormField
                                control={form.control}
                                name="expireDate"
                                render={({ field }) => (
                                    <FormItem className="col-span-4">
                                        <FormLabel size="tiny">Expire Date (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : "Pick a date"}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    fromDate={new Date(Date.now() + 86400000)}
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>
                        {paymentType === "card" && (
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="other.cardId"
                                    render={({ field }) => (
                                        <FormItem >
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

                            </fieldset>
                        )}
                        <Collapsible  >
                            <CollapsibleTrigger disabled={!form.getValues("memberPlanId")}
                                className="disabled:opacity-50 flex group flex-row items-center gap-1  text-sm text-indigo-500">
                                <ChevronRight size={16} className="group-data-[state=open]:rotate-90" />
                                <span className="font-medium">Overwrite</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-4 bg-foreground/5 rounded-sm mt-4 space-y-2">

                                <fieldset >

                                    <FormField
                                        control={form.control}
                                        name="totalClassLimit"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel size="tiny">Total Class Limit</FormLabel>

                                                <FormControl>
                                                    <Input type="number" className="border-none" max={100} placeholder="Total Class Limit" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                <FormDescription className="text-xs">You may overwrite the total class limit for this package.</FormDescription>
                                            </FormItem >
                                        )}
                                    />

                                </fieldset>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel size="tiny">Start Date</FormLabel>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn("w-full border-none pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            fromDate={new Date()}
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                                <FormDescription className="text-xs">
                                                    The start date is set to today's date by default.
                                                </FormDescription>
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

