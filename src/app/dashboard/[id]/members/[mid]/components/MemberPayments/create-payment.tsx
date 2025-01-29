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
    PopoverContent,
    Popover,
    PopoverTrigger,
    Calendar,

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
import { CalendarIcon, Loader2 } from "lucide-react";
import { useMemberPaymentMethods } from "../../providers/MemberContext";
import { format } from "date-fns"

export default function NewMemberPayment() {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()

    const form = useForm<z.infer<typeof NewMemberPaymentSchema>>({
        resolver: zodResolver(NewMemberPaymentSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "",
            chargedDate: new Date(),
            card: "",
            description: "",
            statement: "",
            authorize: false,
        },
        mode: "onSubmit",
    })


    async function onSubmit(data: z.infer<typeof NewMemberPaymentSchema>) {
        console.log(data)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"xs"} className='border'>+ Payment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add a Payment</DialogTitle>
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
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="chargedDate"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Charged Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"}
                                                            className={cn("rounded-sm pl-3 w-full text-left font-normal")}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date > new Date() || date < new Date("1900-01-01")
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
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
                                                        {["Cash", "Zelle", "Bank Payment", "Check", "Charge a Card"].map((method, index) => (
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
                            {form.getValues("paymentMethod") === "Charge a Card" && (

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
                        Add Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
