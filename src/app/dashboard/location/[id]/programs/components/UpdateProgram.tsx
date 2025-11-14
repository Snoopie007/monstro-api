import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui";
import {
    Form, FormField, FormLabel, FormMessage, FormItem, FormControl,
    Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, FormDescription
} from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, tryCatch } from "@/libs/utils";
import { z } from "zod";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePrograms } from "@/hooks/usePrograms";
import { toast } from "react-toastify";
import { UpdateProgramSchema } from "../schemas";
import { useStaffLocations } from "@/hooks/useStaffs";
import { Program } from "@/types";
export interface UpdateProgramProps {

    open: boolean;
    setOpen: (open: boolean) => void;
    program: Program;
}

export function UpdateProgram({ open, setOpen, program }: UpdateProgramProps) {
    const lid = program.locationId;
    const pid = program.id;
    const { sls } = useStaffLocations(lid);
    const { mutate } = usePrograms(lid);
    // Initialize form with default values that match your program structure
    const form = useForm<z.infer<typeof UpdateProgramSchema>>({
        resolver: zodResolver(UpdateProgramSchema),
        defaultValues: {
            description: program?.description || "",
            name: program?.name || "",
            capacity: program?.capacity || 0,
            minAge: program?.minAge || 0,
            maxAge: program?.maxAge || 0,
            instructorId: program?.instructorId || undefined
        },
        mode: "onChange",
    });

    // Reset form when program changes or dialog opens
    useEffect(() => {
        if (program && open) {
            form.reset({
                description: program.description || "",
                name: program.name || "",
                capacity: program.capacity || 0,
                minAge: program.minAge || 0,
                maxAge: program.maxAge || 0,
                instructorId: program.instructorId || undefined
            });
        }
    }, [program, open]);

    async function submitForm(v: z.infer<typeof UpdateProgramSchema>) {
        try {
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/programs/${pid}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        ...v,
                        instructorId: v.instructorId === "null" ? undefined : v.instructorId
                    })
                })
            );

            if (result?.status === 403) {
                toast.error("You are not authorized to update this program");
                return;
            }

            if (error || !result || !result.ok) {
                toast.error("Error updating the program, please try again.");
                return;
            }

            const data = await result.json();
            mutate({ ...program, ...data });
            toast.success("Program updated successfully");
            setOpen(false);
        } catch (error) {
            toast.error("Error updating the program, please try again.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>

            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Update Program</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(submitForm)} className='space-y-4 p-4'>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={"tiny"}>Program Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            type='text'
                                            placeholder="Program Name"
                                            {...field}
                                            value={field.value || ""} // Ensure value is never undefined
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel size={"tiny"}>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Program Description"
                                            className="resize-none"
                                            {...field}
                                            value={field.value || ""} // Ensure value is never undefined
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {sls && sls.length > 0 && (
                            <FormField control={form.control} name="instructorId" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel size={"tiny"}>Default Assigned Staff</FormLabel>
                                    <FormDescription>Select a staff that will be assigned to the program by default. Leave blank to not assign a staff.</FormDescription>
                                    <FormControl>
                                        <Select
                                            {...field}
                                            value={field.value || ""}
                                            onValueChange={(e) => field.onChange(e)}
                                        >
                                            <SelectTrigger className={cn("")}>
                                                <SelectValue placeholder="Select a default assigned staff" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {sls.map((s) => {
                                                    const staff = s.staff;
                                                    if (!staff) return null;
                                                    return (
                                                        <SelectItem key={staff.id} value={staff.id}>
                                                            {staff.firstName} {staff.lastName}
                                                        </SelectItem>
                                                    )
                                                })}
                                                <SelectItem value={"null"} key={"none"}>None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                </FormItem>
                            )} />
                        )}
                        <div className='flex flex-row items-center gap-2 w-full'>
                            <FormField
                                control={form.control}
                                name="capacity"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size={"tiny"}>Capacity</FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                placeholder='Capacity'
                                                {...field}
                                                value={field.value ?? 0} // Ensure value is never undefined
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="minAge"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size={"tiny"}>Min Age</FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                placeholder='Min Age'
                                                {...field}
                                                value={field.value ?? 0} // Ensure value is never undefined
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maxAge"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel size={"tiny"}>Max Age</FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                placeholder='Max Age'
                                                {...field}
                                                value={field.value ?? 0} // Ensure value is never undefined
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>


                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"outline"} >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={form.handleSubmit(submitForm)}
                        variant={"foreground"}
                        disabled={form.formState.isSubmitting || !form.formState.isValid}

                    >
                        {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Update"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}