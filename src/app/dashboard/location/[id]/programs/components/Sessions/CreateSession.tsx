import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogClose,
    DialogFooter,
    DialogBody,
} from "@/components/ui";
import {
    FormField, FormItem, FormControl,
    FormMessage, FormLabel, FormDescription,
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
    Input, Form,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { SessionSchema, DaysOfWeek } from "../../schemas";
import { DialogDescription } from "@/components/ui/dialog";

import { Loader2 } from "lucide-react";
import { Program, Staff } from "@/types";



interface CreateSessionProps {
    program: Program
    availableStaff: Staff[]
    staffId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}


export function CreateSession({ program, availableStaff, staffId, open, onOpenChange, onSuccess }: CreateSessionProps) {

    const { id: pid, locationId: lid } = program;


    const form = useForm<z.infer<typeof SessionSchema>>({
        resolver: zodResolver(SessionSchema),
        defaultValues: {
            day: 1,
            time: "12:00:00",
            duration: 30,
            staffId: staffId ? staffId : undefined
        },
        mode: "onSubmit",
    })



    async function submitForm(v: z.infer<typeof SessionSchema>) {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/programs/${pid}/sessions`, {
                method: "POST",
                body: JSON.stringify(v),
            })
        )
        if (result?.status === 403) {
            toast.error("You are not authorized to create a session");
            return;
        }

        if (error || !result || !result.ok) {
            toast.error(error?.message || "Something went wrong, please try again later")
            return
        }
        
        toast.success("Session Created Successfully")
        form.reset()
        onOpenChange(false)
        onSuccess?.()
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >

            <DialogContent className="w-[500px] max-w-[500px]">
                <DialogHeader className="px-4 py-3 space-y-0">
                    <DialogTitle className="leading-none">
                        Create Session
                    </DialogTitle>
                    <DialogDescription className="hidden"></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form>
                            <fieldset className='grid grid-cols-3 gap-2  ' >
                                <FormField
                                    control={form.control}
                                    name={`day`}
                                    render={({ field, fieldState }) => (
                                        <FormItem className='col-span-1'>

                                            <FormControl>
                                                <Select onValueChange={(v) => field.onChange(parseInt(v) + 1)} value={(field.value - 1).toString()}>
                                                    <SelectTrigger className={cn({ "border-red-500": fieldState.error })}>
                                                        <SelectValue placeholder="Select a day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DaysOfWeek.map((day, i) => (
                                                            <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`time`}
                                    render={({ field }) => (
                                        <FormItem className={cn("col-span-1")}>
                                            <FormControl>
                                                <Input type="time"
                                                    step="1"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                    className="bg-background rounded-md appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none border-foreground/10"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`duration`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 ">

                                            <FormControl>
                                                <Input type='number' className={cn("")} placeholder={'Duration'}
                                                    value={field.value}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        if (value) {
                                                            field.onChange(value);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {availableStaff && availableStaff.length > 0 && (
                                    <FormField
                                        control={form.control}
                                        name={`staffId`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-3 ">
                                                <FormLabel size={"tiny"}>Assign a Staff</FormLabel>
                                                <FormDescription>Manually assign a staff to the session</FormDescription>
                                                <FormMessage />
                                                <FormControl>
                                                    <Select onValueChange={(v) => field.onChange(v)} value={field.value || ""}>
                                                        <SelectTrigger className={cn("")}>
                                                            <SelectValue placeholder="Assign a Staff" />
                                                        </SelectTrigger>

                                                        <SelectContent>
                                                            {availableStaff.map((staff) => (
                                                                <SelectItem key={staff.id} value={staff.id}>
                                                                    {staff.firstName} {staff.lastName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter >
                    <DialogClose asChild>
                        <Button variant={"outline"}   >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit"
                        variant={"foreground"}
                        onClick={form.handleSubmit(submitForm)}
                        disabled={!form.formState.isValid || form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog >
    );
}
