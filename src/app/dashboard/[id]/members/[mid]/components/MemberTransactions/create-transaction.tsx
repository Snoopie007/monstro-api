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
import { NewMemberPaymentSchema } from "../../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useMemberPaymentMethods } from "../../providers/MemberContext";
import { useMemberPrograms } from "@/hooks/use-members";
import { Plan, Program } from "@/types";

import { toast } from "react-toastify";


export default function NewMemberTransaction({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods();
    const { programs, isLoading: programIsLoading } = useMemberPrograms(params.id, params.mid);

    const form = useForm<z.infer<typeof NewMemberPaymentSchema>>({
        resolver: zodResolver(NewMemberPaymentSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "",
            card: "",
            description: "",
            statement: "",
            chargeFor: "",
            item: "",
            planId: 0,
            programId: 0
        },
        mode: "onSubmit",
    })

    const method = form.watch("paymentMethod")
    const chargeFor = form.watch("chargeFor")
    const programId = form.watch("programId")

    async function onSubmit(data: z.infer<typeof NewMemberPaymentSchema>) {
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
                            {chargeFor == "One Time" &&
                                (
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
                                <>
                                    <fieldset>
                                        <FormField
                                            control={form.control}
                                            name="programId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Program</FormLabel>
                                                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a program" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {!programIsLoading && programs.map((program: Program, index: number) => (
                                                                program.plans.length ? <SelectItem key={index} value={program.id.toString()}>{program.name}</SelectItem> : null
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
                                            name="planId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Plan</FormLabel>
                                                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a plan" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {programId && programs.find((program: Program) => program.id == programId).plans.map((plan: Plan, index: number) => (
                                                                (plan.contractId && plan.id) ? <SelectItem key={index} value={plan.id?.toString()}>{plan.name}</SelectItem> : null
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </fieldset>
                                </>
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
                                                        {["Cash", "Stripe", "Zelle", "Bank Payment", "Check", "Charge a Card"].map((method, index) => (
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
                            {method === "Charge a Card" && (

                                <fieldset className="flex flex-row items-center gap-2">
                                    <FormField
                                        control={form.control}
                                        name="card"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Select a Card</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a card" />

                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {paymentMethods.map((method, index) => (
                                                            <SelectItem key={index} value={method.id} className="w-full">
                                                                <div className="flex flex-row items-center justify-between gap-4">
                                                                    <div className="flex flex-row items-center gap-2">
                                                                        <img src={`/images/cards/${method.card?.brand}.svg`} alt={method.card?.brand} className="h-7 w-7" />
                                                                        <span className="text-sm capitalize">{method.card?.brand} •••• {method.card?.last4}</span>
                                                                    </div>
                                                                    <span className="text-sm">{method.card?.exp_month} / {method.card?.exp_year}</span>
                                                                </div>
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
