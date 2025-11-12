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

import { useState } from "react";
import { NewPackageSchema } from "../../../schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon, ChevronRight } from "lucide-react";
import { cn, tryCatch } from "@/libs/utils";
import { useMemberStatus } from "../../../providers";
import { PaymentMethod } from "@/types";
import React from "react";
import { MemberPackage, MemberPlan } from "@/types";
import { toast } from "react-toastify";
import { useMemberPackages, } from "@/hooks";
import { PMSelect } from "../../PMSelect";

interface PkgFormProps {
    lid: string
    mid: string
    pkgs: MemberPlan[]
    onFinish: (data: MemberPackage) => void
}

export function PkgForm({ lid, mid, pkgs, onFinish }: PkgFormProps) {
    const [paymentType, setPaymentType] = useState<"card" | "cash">("cash");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const { mutate } = useMemberPackages(lid, mid)
    const { paymentMethods } = useMemberStatus()


    const form = useForm<z.infer<typeof NewPackageSchema>>({
        resolver: zodResolver(NewPackageSchema),
        defaultValues: {
            startDate: new Date(),
            expireDate: undefined,
            memberPlanId: undefined,
            totalClassLimit: undefined,

        },
        mode: "onSubmit",
    })



    async function onSubmit(v: z.infer<typeof NewPackageSchema>) {
        if (paymentType === "card" && !paymentMethod) {
            toast.error("Please select a payment method")
            return
        }
        const path = paymentType === "card" ? "pkgs" : "pkgs/cash"
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${mid}/${path}`, {
                method: "POST",
                body: JSON.stringify({
                    ...v,
                    paymentType,
                    paymentMethod: paymentMethod
                })
            })
        )

        if (error || !result?.ok) return;

        form.reset()
        const data = await result.json()
        await mutate()
        toast.success("Package created successfully")
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
                                        <FormLabel size="tiny">Select a Plan</FormLabel>
                                        <Select onValueChange={field.onChange} >
                                            <FormControl>
                                                <SelectTrigger >
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {pkgs && pkgs.map((pkg: MemberPlan, index: number) => (
                                                    (pkg.id) ? <SelectItem key={index} value={pkg.id?.toString()}>
                                                        {pkg.name}
                                                    </SelectItem> : null
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>

                        <fieldset className="grid grid-cols-7 gap-2">
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
                            <FormField
                                control={form.control}
                                name="expireDate"
                                render={({ field }) => (
                                    <FormItem className="col-span-4">
                                        <FormLabel size="tiny">Expire Date (Optional)</FormLabel>
                                        <DatePicker value={field.value} onChange={field.onChange} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </fieldset>
                        {paymentType === 'card' && (
                            <>
                                <fieldset>

                                    <FormLabel size="tiny">Payment Method</FormLabel>
                                    <PMSelect paymentMethods={paymentMethods || []}
                                        onChange={(paymentMethod) => {
                                            setPaymentMethod(paymentMethod)
                                        }} value={paymentMethod?.stripeId || undefined}
                                        disabled={!form.getValues("memberPlanId")}
                                    />

                                </fieldset>

                                <Collapsible  >
                                    <CollapsibleTrigger disabled={!paymentMethod}
                                        className="disabled:opacity-50 flex group flex-row items-center gap-1  text-sm text-indigo-500">
                                        <ChevronRight size={16} className="group-data-[state=open]:rotate-90" />
                                        <span className="font-medium">Overwrite</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="p-2 bg-foreground/5 rounded-lg  space-y-2">

                                        <fieldset >

                                            <FormField
                                                control={form.control}
                                                name="totalClassLimit"
                                                render={({ field }) => (
                                                    <FormItem >
                                                        <FormLabel size="tiny">Total Class Limit</FormLabel>

                                                        <FormControl>
                                                            <Input type="number" max={100} placeholder="Total Class Limit" {...field} />
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
                                                        <DatePicker value={field.value} onChange={field.onChange} />
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
                            </>
                        )}



                    </form>
                </Form>
            </DialogBody>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
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



function DatePicker({ value, onChange }: { value: Date | undefined, onChange: (date: Date) => void }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline"

                    className={cn(
                        "w-full pl-3  h-12 text-left font-normal bg-background border-foreground/10 rounded-lg",
                        !value && "text-muted-foreground"
                    )}>
                    {value ? format(value, "PPP") : "Pick a date"}
                    <CalendarIcon className="ml-auto size-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-foreground/10 overflow-hidden" align="start">
                <Calendar
                    mode="single"
                    captionLayout="dropdown-months"
                    disabled={(d) => d < new Date()}
                    selected={value}
                    onSelect={(d) => {
                        onChange(d || new Date())
                    }}

                />
            </PopoverContent>
        </Popover>
    )
}



