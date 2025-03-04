import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
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
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { NewPlanSchema, PlanType } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { DialogClose, DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";

import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { PlanSubFields } from "./SubFields";
import { PlanPkgFields } from "./PkgFields";
import { Contract } from "@/types";

interface CreatePlanProps {
    lid: string,
    pid: number
}

export function CreatePlan({ lid, pid }: CreatePlanProps) {

    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof NewPlanSchema>>({
        resolver: zodResolver(NewPlanSchema),
        defaultValues: {
            name: "",
            description: "",
            family: false,
            familyMemberLimit: 0,
            interval: "month",
            intervalCount: 1,
            amount: 0,
            subscription: {
                allowProration: false,
                billingAnchor: undefined
            },
            pkg: {
                expireDate: new Date(),
                totalClassLimit: 0,
                intervalClassLimit: 0
            },
            contractId: 0,
        },
        mode: 'onSubmit'
    })

    const type = form.watch('type')


    async function submitForm(v: z.infer<typeof NewPlanSchema>) {
        console.log(v)

    }

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"}  >
                    + Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader className="space-y-0" >
                    <DialogTitle>Create Plan</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form action="" className="space-y-2">
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            {field.value && (
                                                <div className=" text-xs ">
                                                    Plan type: <span className=" capitalize">{field.value} </span>
                                                    <span className="text-indigo-500 cursor-pointer" onClick={() => field.onChange(null)}>(Change)</span>
                                                </div>
                                            )}
                                            {!field.value && PlanType.map((type, index) => (
                                                <div key={index} className={cn(
                                                    'col-span-1    border bg-background border-foreground/20 rounded-sm p-4 cursor-pointer',
                                                    'hover:border-indigo-500 hover:text-indigo-500',

                                                )}
                                                    onClick={() => field.onChange(type.value)}
                                                >
                                                    <div className='space-y-1'>
                                                        <div className='text-sm font-medium leading-none'>{type.label}</div>
                                                        <p className="text-xs text-muted-foreground">{type.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <div className={cn({ "hidden": !type }, 'space-y-2  ')}>
                                <fieldset className="grid grid-cols-2 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel size={"tiny"}>Plan Name</FormLabel>
                                                <FormControl>
                                                    <Input type='text' className={cn("")} placeholder="Plan Name" {...field} />
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
                                                    <Input type='number' className={cn("")} placeholder="Enter price"
                                                        step="0.01"
                                                        {...field}
                                                        onChange={(e) => e.target.value && field.onChange(parseFloat(e.target.value))}
                                                    />
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
                                                <FormLabel size={"tiny"}>Plan Description</FormLabel>
                                                <FormControl>
                                                    <Textarea className={"resize-none"} placeholder="Short description" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>

                                        )}
                                    />
                                </fieldset>

                                {type === "recurring" && <PlanSubFields lid={lid} form={form} />}
                                {type === "one-time" && <PlanPkgFields lid={lid} form={form} />}

                            </div>
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
                        <Button size={"sm"} onClick={form.handleSubmit(submitForm)} variant={"foreground"}
                            className={cn("children:hidden", { "children:inline-block": loading })}
                            disabled={form.formState.isSubmitting || !form.formState.isValid}
                        >
                            <Loader2 className="mr-2 animate-spin" size={14} />
                            Save
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}
