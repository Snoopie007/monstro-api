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
    FormDescription,
    PriceInput
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { NewPlanSchema } from "@/libs/FormSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { DialogClose, DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";

import { toast } from "react-toastify";
import { PlanSubFields } from "./SubFields";
import { mutate } from "swr";
import { Loader2 } from "lucide-react";
import { PlanPkgFields } from "./PkgFields";
import AddPrograms from "../AddPrograms";


interface CreatePlanProps {
    lid: string
    type: 'subs' | 'pkgs'
}

export function CreatePlan({ lid, type }: CreatePlanProps) {
    const [open, setOpen] = useState(false);



    const form = useForm<z.infer<typeof NewPlanSchema>>({
        resolver: zodResolver(NewPlanSchema),
        defaultValues: {
            name: "",
            description: "",
            type: type === 'subs' ? 'recurring' : 'one-time',
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

    async function onSubmit(v: z.infer<typeof NewPlanSchema>) {
        if (form.formState.isSubmitting) return;


        try {
            const { pkg, sub, ...rest } = v;
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/plans/${type}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        ...rest,
                        ...(type === 'subs' ? { ...sub } : { ...pkg })
                    })
                })
            )

            if (error || !result || !result.ok) {
                toast.error(error?.message || "Something went wrong");
                return;
            }

            toast.success(`${type === "subs" ? "Subscription" : "Package"} created successfully`);
            form.reset();
            await mutate(`/api/protected/loc/${lid}/plans/${type}`);
            setOpen(true);
        } catch (error) {
            console.error("Error creating plan:", error);
            toast.error("Failed to create plan");
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"ghost"}
                    className='flex-1 items-center gap-1 rounded-sm bg-foreground/10 hover:bg-foreground/10' >
                    + {type === "subs" ? "Subscription" : "Package"}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg border-foreground/10">
                <DialogHeader className="space-y-0">
                    <DialogTitle>{type === "subs" ? "Create Subscription" : "Create Package"}</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className="space-y-2">
                            <fieldset className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
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
                                                <PriceInput value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size={"tiny"}>Description</FormLabel>
                                            <FormControl>
                                                <Textarea className={"resize-none h-8 border-foreground/10"} placeholder="Short description" {...field} />
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
                                            <FormDescription className="text-xs">
                                                Select at least one program that this plan will include.
                                            </FormDescription>
                                            <FormControl>
                                                <AddPrograms value={field.value || []} onChange={(selectedPrograms) => {
                                                    field.onChange(selectedPrograms);
                                                }} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            {type === "subs" && <PlanSubFields lid={lid} form={form} />}
                            {type === "pkgs" && <PlanPkgFields lid={lid} form={form} />}
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <div className="flex flex-row gap-2 items-center">
                        <DialogClose asChild>
                            <Button size={"sm"} variant={"outline"} className="bg-transparent">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            size={"sm"}
                            onClick={form.handleSubmit(onSubmit)}
                            variant={"foreground"}
                            disabled={form.formState.isSubmitting || !form.formState.isValid}
                        >
                            {form.formState.isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
