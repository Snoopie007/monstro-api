import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui";
import { cn } from "@/libs/utils";
import { z } from "zod";
import { Contract, Plan } from '@/types'
import {
    Checkbox,
    Form,
    FormField,
    FormLabel,
    FormMessage,
    FormItem,
    FormControl,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Input,
    Textarea,
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { PlanSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { DialogClose, DialogDescription } from "@radix-ui/react-dialog";
import { useContractsByLocationId } from "@/hooks/use-contracts";
import { addPlan } from "@/libs/api";



interface CreatePlanProps {
    plan: Plan | null
    onChange: (plan: Plan | null) => void,
    locationId: string,
    programId: number
}
const Intervals: { label: string, value: string }[] = [
    { label: "One Time", value: "One Time" },
    { label: "Daily", value: "day" },
    { label: "Weekly", value: "week" },
    { label: "Monthly", value: "month" },
    { label: "Yearly", value: "year" }
];

export default function UpsertPlan({ plan, onChange, locationId, programId }: CreatePlanProps) {
    const { contracts, isLoading: isContractsLoading } = useContractsByLocationId(locationId);


    const form = useForm<z.infer<typeof PlanSchema>>({
        resolver: zodResolver(PlanSchema),
        defaultValues: {
            name: '',
            description: '',
            family: false,
            family_member_limit: 0,
            pricing: {
                amount: 0.00,
                billing_period: ''
            },
            contractId: 0
        },
        mode: 'onSubmit'
    })

    useEffect(() => {
        if (plan) { form.reset(plan) }
    }, [plan])

    async function submitForm(v: z.infer<typeof PlanSchema>) {
        const response = await addPlan(v, programId, locationId).then((response) => {
            onChange(null);
            return response
        });
        return response;
    }

    return (
        <Dialog open={!!plan} onOpenChange={(open: boolean) => { !open && onChange(null) }} >
            <DialogContent className="p-0">
                <DialogHeader className="p-4 border-b  border-foreground/10">
                    <DialogTitle>{plan?.name === "" ? "Create" : "Update"} Plan</DialogTitle>
                    <DialogDescription>
                        {plan?.name === "" ? "Create a new plan for this program" : "Update the plan details"}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form action="" className="space-y-2 py-2 px-4">
                        <fieldset>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem >
                                        <FormLabel>Plan Name</FormLabel>
                                        <FormControl>
                                            <Input type='text' className={cn("")} placeholder="Plan Name" {...field} />
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
                                    <FormItem >
                                        <FormLabel>Plan Description</FormLabel>
                                        <FormControl>
                                            <Textarea className={"resize-none"} placeholder="Short description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>

                                )}
                            />
                        </fieldset>
                        <fieldset className="flex flex-row items-center gap-2">
                            <FormField
                                control={form.control}
                                name="pricing.amount"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Price</FormLabel>
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
                            <FormField
                                control={form.control}
                                name="pricing.billing_period"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Billing Period</FormLabel>

                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Billing Period" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Intervals.map((interval, index) => (
                                                    <SelectItem key={index} value={interval.value}>{interval.label}</SelectItem>
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
                                name="contractId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Attach a Contract</FormLabel>

                                        <Select onValueChange={(e) => field.onChange(parseInt(e))} defaultValue={`${field.value}`}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a contract" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {!isContractsLoading && contracts && contracts.map((contract: Contract, index: number) => (
                                                    <SelectItem key={index} value={`${contract.id}`}>{contract.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>

                        <fieldset >
                            <FormField
                                control={form.control}
                                name="family"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-start gap-2 my-4 space-y-0">

                                        <FormControl>
                                            <Checkbox
                                                className="border-foreground"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="flex flex-row items-center cursor-pointer space-y-0 leading-none">
                                            Allow Additional Family Members to Be Added.
                                        </FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </fieldset>
                        {form.getValues('family') && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="family_member_limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Family</FormLabel>
                                            <FormControl>
                                                <Input type='number' className={cn("")}
                                                    {...field}
                                                    onChange={(e) => e.target.value && field.onChange(parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                    </form>
                </Form>
                <DialogFooter className="bg-foreground/5 p-4">
                    <div className="flex flex-row gap-2 items-center">
                        <DialogClose asChild>
                            <Button onClick={() => { }} variant={"outline"} className="bg-transparent">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" onClick={form.handleSubmit(submitForm)} variant={"foreground"} className="">
                            Save
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
