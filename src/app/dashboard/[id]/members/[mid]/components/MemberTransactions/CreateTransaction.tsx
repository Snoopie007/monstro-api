import {
    Button,
    Dialog,
    DialogBody,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui";
import {
    Form, FormField, FormLabel, FormMessage, FormItem, FormControl,
    Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
    Input,
    Textarea,
} from "@/components/forms";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TransactionSchema } from "../../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { MemberSubscription } from "@/types";

import { toast } from "react-toastify";


export default function NewMemberTransaction({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);

    const form = useForm<z.infer<typeof TransactionSchema>>({
        resolver: zodResolver(TransactionSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "",
            card: "",
            description: "",
            statement: "",
            chargeFor: "",
            item: "",
            memberSubscriptionId: 0
        },
        mode: "onSubmit",
    })

    const chargeFor = form.watch("chargeFor")

    async function getSubscriptions() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/${params.id}/members/${params.mid}/subscriptions`)
        )

        if (error || !result || !result.ok) return;
        const data = await result.json()
        setSubscriptions(data)
    }


    async function onSubmit(data: z.infer<typeof TransactionSchema>) {
        setLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/${params.id}/transactions/member`, {
                method: "POST",
                body: JSON.stringify({
                    ...data,
                    memberId: params.mid
                })
            })
        )

        if (error || !result || !result.ok) {
            setLoading(false);
            toast.error("Something went wrong, please try again later");
            return;
        }

        setOpen(false);
        setLoading(false);
        toast.success("Transaction Added Successfully");
        form.reset();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"xs"} className='border'>+ Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add a Transaction</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-2' >
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="chargeFor"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Transaction Type</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a transaction type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {["One Time", "Subscription"].map((method, index) => (
                                                            <SelectItem key={index} value={method} className="w-full">
                                                                {method}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            {chargeFor == "One Time" && (
                                <>
                                    <fieldset className="flex flex-row items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name="item"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Item</FormLabel>
                                                    <FormControl>
                                                        <Input type="text" placeholder="Name of the item" className={cn("w-full ")} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>

                                            )}
                                        />
                                    </fieldset>
                                    <fieldset className="flex flex-row items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Amount</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-[50%] -translate-y-[51%] text-sm text-foreground/50">$</span>
                                                            <Input type="number" step="0.01" min="0.00" className={cn("w-full pl-6")} placeholder="0.00" {...field}
                                                                value={field.value === 0 ? "" : field.value}
                                                                onChange={(e) => {
                                                                    field.onChange(e.target.value === "" ? "" : Math.floor(parseFloat(e.target.value) * 100) / 100)
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </fieldset>
                                </>
                            )}
                            {chargeFor == "Subscription" && (
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="memberSubscriptionId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subscription</FormLabel>
                                                <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a program" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {subscriptions.map((sub: MemberSubscription, index: number) => (
                                                            sub.plan ? <SelectItem key={index} value={`${sub.id}`}>
                                                                {sub.plan.name}
                                                            </SelectItem> : null
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                            )}

                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Payment Method</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a payment method" />

                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {["Cash", "Zelle", "Bank Payment", "Check"].map((method, index) => (
                                                            <SelectItem key={index} value={method.toLowerCase()} className="w-full">
                                                                {method}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>


                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="statement"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Statement desc</FormLabel>
                                            <FormControl>
                                                <Input type="text" className={cn("w-full ")} {...field} />
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
                                        <FormItem className="flex-1">
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea className={cn("w-full resize-none")} {...field} placeholder="Product or service assoicated with payment" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"xs"}>Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("",)}
                        variant={"foreground"}
                        size={"xs"}
                        type="submit"
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Add Transaction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
