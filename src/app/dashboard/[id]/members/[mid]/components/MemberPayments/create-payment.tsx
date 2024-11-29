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
    Checkbox,
    FormDescription,
} from "@/components/forms";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NewMemberPaymentSchema } from "../../schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useMemberPaymentMethods } from "../../providers/MemberContext";


export default function NewMemberPayment() {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()

    const form = useForm<z.infer<typeof NewMemberPaymentSchema>>({
        resolver: zodResolver(NewMemberPaymentSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "",
            description: "",
            statement: "",
            authorize: false,
        },
        mode: "onSubmit",
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"} className='rounded-sm'>+ Payment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create a Payment</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='space-y-2' >
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
                            <fieldset className="flex flex-row items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Payment Method</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a payment method" />

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
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="authorize"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-y-0 mt-4  gap-2 ">
                                            <FormControl>
                                                <Checkbox
                                                    className="border-foreground"
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>

                                            <div className="space-y-0.5 leading-none">
                                                <FormLabel >
                                                    Authorize only
                                                </FormLabel>
                                                <FormDescription>
                                                    You'll have a 7 days to capture this payment.
                                                </FormDescription>
                                            </div>

                                        </FormItem>
                                    )} />
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"sm"}>Cancel</Button>
                    </DialogClose>
                    <Button
                        className={cn("",)}
                        variant={"foreground"}
                        size={"sm"}
                        type="submit"

                    >
                        <Loader2 className="mr-2 h-4 w-4 hidden animate-spin" />
                        Create Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
