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
    Popover,
    PopoverTrigger,
    PopoverContent,
    Calendar
} from "@/components/ui";
import {
    Form, FormField, FormLabel, FormMessage, FormItem, FormControl,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
    Input,
    Textarea,
} from "@/components/forms";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, tryCatch } from "@/libs/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useMember } from "../../providers/MemberContext";
import { format } from "date-fns"
import { ChargeItemSchema } from "../../schema";


export default function ChargeItem({ params }: { params: { id: string, mid: number } }) {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const { member } = useMember();


    const form = useForm<z.infer<typeof ChargeItemSchema>>({
        resolver: zodResolver(ChargeItemSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "",
            description: "",
            cardId: undefined,
            item: "",
            chargeDate: undefined,
        }
    });



    async function onSubmit(v: z.infer<typeof ChargeItemSchema>) {
        setLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/members/${params.mid}/payment`, {
                method: "POST",
                body: JSON.stringify(v)
            })
        );

        if (error || !result?.ok) {
            toast.error("Something went wrong, please try again later");
        } else {
            toast.success("Item was successfully charged");
            form.reset();
            setOpen(false);
        }
        setLoading(false);
    }

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            form.reset();
        }
        setOpen(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                <Button variant="foreground" size="xs" className="border">Charge</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Charge for an item </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className="space-y-2">

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size="tiny">Amount</FormLabel>
                                        <div className="relative">
                                            <span className="absolute left-3 top-[50%] -translate-y-[48%] text-sm text-foreground/50">$</span>
                                            <Input {...field} type="number" step="0.01" min="0.00" className="pl-6" placeholder="0.00" value={field.value || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value ? Math.floor(parseFloat(e.target.value) * 100) / 100 : "";
                                                    field.onChange(value);
                                                }}
                                            />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="item"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size="tiny">Item</FormLabel>
                                        <Input {...field} type="text" placeholder="Name of the item" />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="chargeDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Charge Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : "Pick a date"}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['card', "cash", "zelle", "bank payment", "cheque"].map((method) => (
                                                    <SelectItem key={method} value={method.toLowerCase()} className="capitalize">
                                                        {method}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel size="tiny">Description</FormLabel>
                                        <Textarea {...field} className="resize-none" placeholder="Product or service associated with payment" />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size="sm">Cancel</Button>
                    </DialogClose>
                    <Button
                        variant="foreground"
                        size="sm"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Charge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
