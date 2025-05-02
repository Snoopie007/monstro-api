'use client';
import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import {
    Form,
    FormField,
    FormLabel,
    FormMessage,
    FormItem,
    FormControl,
    Input,
    Textarea,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    FormDescription
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { NewPlanSchema } from "@/libs/FormSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { DialogClose, DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";

import { toast } from "react-toastify";
import { PlanSubFields } from "./SubFields";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { PlanPkgFields } from "./PkgFields";
import AddPrograms from "../AddPrograms";

interface CreatePlanProps {
    lid: string
    type: "recurring" | "one-time"
}

export function CreatePlan({ lid, type }: CreatePlanProps) {
    const { mutate } = useSWR(`/api/protected/loc/${lid}/plans/${type === "recurring" ? "subs" : "pkgs"}`);

    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof NewPlanSchema>>({
        resolver: zodResolver(NewPlanSchema),
        defaultValues: {
            name: "",
            description: "",
            type: type,
            family: false,
            familyMemberLimit: 0,
            amount: 0,
            programs: [],
            intervalClassLimit: undefined,
            sub: {
                interval: 'month',
                intervalThreshold: 1,
                allowProration: false,
                billingAnchor: undefined
            },
            pkg: {
                expireInterval: undefined,
                expireThreshold: undefined,
                totalClassLimit: 0,
            },
            contractId: undefined,
        },
        mode: 'onSubmit'
    })

    async function submitForm(v: z.infer<typeof NewPlanSchema>) {
        setLoading(true)
        const { pkg, sub, ...rest } = v

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/plans/${type === "recurring" ? "subs" : "pkgs"}`, {
                method: 'POST',
                body: JSON.stringify({
                    ...rest,
                    ...(type === 'recurring' ? { ...sub } : { ...pkg })
                })
            })
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong")
            setLoading(false)
            return
        }

        toast.success("Subscription created successfully")
        setLoading(false)
        form.reset()
        mutate()
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"xs"}  >
                    + {type === "recurring" ? "Subscription" : "Package"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader className="space-y-0" >
                    <DialogTitle>{type === "recurring" ? "Create Subscription" : "Create Package"}</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form action="" className="space-y-2">

                            <fieldset className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem >
                                            <FormLabel size={"tiny"}>Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("")} placeholder="Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel size={"tiny"}>Price</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-[50%] -translate-y-[50%] text-sm text-foreground/50">$</span>
                                                    <Input {...field} type="number" step="0.01" min="0.00" className="pl-6" placeholder="0.00" value={field.value || ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value ? Math.floor(parseFloat(e.target.value) * 100) / 100 : "";
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset >
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem >
                                            <FormLabel size={"tiny"}>Description</FormLabel>
                                            <FormControl>
                                                <Textarea className={"resize-none min-h-8"} placeholder="Short description" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="programs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Select Programs</FormLabel>
                                            <FormDescription className="text-xs ">
                                                Select at least one program that this plan will include.
                                            </FormDescription>
                                            <FormControl>
                                                <AddPrograms value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />

                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            {type === "recurring" && <PlanSubFields lid={lid} form={form} />}
                            {type === "one-time" && <PlanPkgFields lid={lid} form={form} />}
                        </form>
                    </Form >
                </DialogBody >
                <DialogFooter>
                    <div className="flex flex-row gap-2 items-center">
                        <DialogClose asChild>
                            <Button size={"sm"} variant={"outline"} className="bg-transparent">
                                Cancel
                            </Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button size={"sm"} onClick={form.handleSubmit(submitForm)} variant={"foreground"}
                                className={cn("children:hidden", { "children:inline-block": loading })}
                                disabled={form.formState.isSubmitting || !form.formState.isValid || loading}
                            >
                                <Loader2 className="size-3 mr-2 animate-spin" />
                                Save
                            </Button>
                        </DialogClose>
                    </div>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}
