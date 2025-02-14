
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
    PopoverContent,
    Calendar,
} from "@/components/ui";
import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Input,
} from '@/components/forms';

import { useState } from "react";
import { NewEnrollmentSchema } from "../../schema";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/libs/utils";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { addDays, format } from "date-fns"
import { EndDatePresets, StartDatePresets } from "./data";
import { useMemberPaymentMethods } from "../../providers/MemberContext";

export function CreateEnrollment() {
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const { paymentMethods } = useMemberPaymentMethods()

    const form = useForm<z.infer<typeof NewEnrollmentSchema>>({
        resolver: zodResolver(NewEnrollmentSchema),
        defaultValues: {
            startDate: new Date(),
            endDate: undefined,
            trail: 0,
        },
        mode: "onSubmit",
    })

    const startDate = form.watch("startDate")

    async function onSubmit(data: z.infer<typeof NewEnrollmentSchema>) {
        console.log(data)
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"xs"} className='border'>+ Enrollment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Enrollment</DialogTitle>
                </DialogHeader>
                <DialogBody>

                    <Form {...form}>
                        <form className='space-y-2' >

                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="programId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Program</FormLabel>

                                            <Select onValueChange={field.onChange} >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a program" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="m@example.com">m@example.com</SelectItem>
                                                    <SelectItem value="m@google.com">m@google.com</SelectItem>
                                                    <SelectItem value="m@support.com">m@support.com</SelectItem>
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

                                            <Select onValueChange={field.onChange} disabled={!form.getValues("programId")}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a plan" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="m@example.com">m@example.com</SelectItem>

                                                </SelectContent>
                                            </Select>

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
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.getValues("planId")}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a payment method" />

                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {paymentMethods.map((method, index) => (
                                                        <>
                                                            {method.card ? (
                                                                <SelectItem key={index} value={method.id} className="w-full">
                                                                    <div className="flex flex-row items-center justify-between gap-4">
                                                                        <div className="flex flex-row items-center gap-2">
                                                                            <img src={`/images/cards/${method.card.brand}.svg`} alt={method.card.brand} className="h-7 w-7" />

                                                                            <span className="text-sm capitalize">{method.card.brand} •••• {method.card.last4}</span>
                                                                        </div>
                                                                        <span className="text-sm">{method.card.exp_month} / {method.card.exp_year}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ) : null}
                                                        </>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className="grid grid-cols-5 gap-2">
                                <FormField
                                    control={form.control}
                                    name="trail"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Trial days</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2 col-span-3">
                                    <FormLabel>Duration</FormLabel>
                                    <div className="border rounded-md  px-3 py-2  flex flex-row items-center bg-background">
                                        <CalendarIcon size={16} className="-mt-0.5 mr-1" />
                                        <div className="flex flex-row items-center gap-1">

                                            <FormField
                                                control={form.control}
                                                name="startDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <DatePicker field={field} presets={StartDatePresets} />
                                                    </FormItem>
                                                )}
                                            />
                                            <span className="text-foreground/80">-</span>
                                            <FormField
                                                control={form.control}
                                                name="endDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <DatePicker field={field} presets={EndDatePresets} startDate={startDate} />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                </div>

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
                        Add Enrollment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}

interface DatePickerProps<K extends "startDate" | "endDate"> {
    field: ControllerRenderProps<z.infer<typeof NewEnrollmentSchema>, K>
    presets: { name: string, days: number }[]
    startDate?: Date

}

function DatePicker<K extends "startDate" | "endDate">({ field, presets, startDate }: DatePickerProps<K>) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant={"ghost"} className={cn("w-full text-left h-auto p-0 leading-2  px-1.5 rounded-sm  font-normal")} >

                    {field.value ? format(field.value, "LLL dd, y") : "Never"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto flex flex-row p-0" align="start">
                <Calendar
                    initialFocus
                    fromDate={startDate ? addDays(startDate, 30) : new Date()}
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                        field.onChange(date)
                        setOpen(false)
                    }}

                />
                <div className="bg-foreground/5 p-4 w-[150px]">
                    <ul className="space-y-1">
                        {presets.map((preset) => (
                            <li key={`${preset.name}`}
                                onClick={() => {

                                    if (preset.name === "Never") {
                                        field.onChange(undefined)
                                    } else {
                                        field.onChange(addDays(new Date(), preset.days))
                                    }
                                    setOpen(false)

                                }}
                                className="text-sm cursor-pointer hover:text-indigo-500 font-medium"
                            >
                                {preset.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </PopoverContent>
        </Popover>
    )
}