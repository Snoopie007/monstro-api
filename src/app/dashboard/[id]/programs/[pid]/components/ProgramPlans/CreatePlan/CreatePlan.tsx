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
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { NewPlanSchema, PlanType } from "../../../../schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { DialogClose, DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";

import { toast } from "react-toastify";
import { PlanSubFields } from "./SubFields";
import { PlanPkgFields } from "./PkgFields";

import useSWR from "swr";

interface CreatePlanProps {
    lid: string,
    pid: number
}

export function CreatePlan({ lid, pid }: CreatePlanProps) {
    const { mutate } = useSWR(`/api/protected/${lid}/programs/${pid}`);

    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof NewPlanSchema>>({
        resolver: zodResolver(NewPlanSchema),
        defaultValues: {
            name: "",
            description: "",
            family: false,
            familyMemberLimit: 0,
            amount: 0,
            classLimitInterval: undefined,
            classLimitThreshold: undefined,
            subscription: {
                interval: 'month',
                intervalThreshold: 1,
                allowProration: false,
                billingAnchor: undefined
            },
            pkg: {
                expireInterval: undefined,
                expireThreshold: undefined,
                totalClassLimit: 0,
                intervalClassLimit: undefined
            },
            contractId: undefined,
        },
        mode: 'onSubmit'
    })

    const type = form.watch('type')


    async function submitForm(v: z.infer<typeof NewPlanSchema>) {
        setLoading(true)
        const { pkg, subscription, ...rest } = v
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${lid}/programs/${pid}/plans`, {
                method: 'POST',
                body: JSON.stringify({
                    ...rest,
                    ...(type === 'recurring' ? { ...subscription } : { ...pkg })
                })
            })
        )
        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong")
            setLoading(false)
            return
        }

        toast.success("Plan created successfully")
        setLoading(false)
        mutate()
        setOpen(false)
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
                                                <FormLabel size={"tiny"}>Plan Description</FormLabel>
                                                <FormControl>
                                                    <Textarea className={"resize-none"} placeholder="Short description" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>

                                        )}
                                    />
                                </fieldset>
                                <fieldset className=' flex-1 grid grid-cols-3 gap-2 items-baseline'>
                                    <FormField
                                        control={form.control}
                                        name="pkg.intervalClassLimit"
                                        render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel size={"tiny"}>Class Limit(Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type='number' placeholder="" onChange={(e) => {
                                                        if (e.target.value) {
                                                            field.onChange(parseInt(e.target.value))
                                                            form.setValue("classLimitThreshold", 1)
                                                        }
                                                    }} value={field.value || ""} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="classLimitInterval"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel size={"tiny"} >Per(Optional)</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} defaultValue={'month'} >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {['week', 'month', 'year'].map((preset, index) => (
                                                            <SelectItem key={index} value={preset}>
                                                                {preset}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

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
                        <DialogClose asChild>
                            <Button size={"sm"} onClick={form.handleSubmit(submitForm)} variant={"foreground"}
                                className={cn("children:hidden", { "children:inline-block": loading })}
                                disabled={form.formState.isSubmitting || !form.formState.isValid || loading}
                            >
                                Save
                            </Button>
                        </DialogClose>
                    </div>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}
