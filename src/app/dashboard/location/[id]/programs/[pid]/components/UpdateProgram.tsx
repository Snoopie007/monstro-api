import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui";
import { Form, FormField, FormLabel, FormMessage, FormItem, FormControl, Input, Textarea } from "@/components/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useProgram } from "@/hooks/usePrograms";
import { toast } from "react-toastify";
import { UpdateProgramSchema } from "../../schemas";

export interface UpdateProgramProps {
    pid: string,
    lid: string
}

export function UpdateProgram({ pid, lid }: UpdateProgramProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { program, mutate } = useProgram(lid, pid);
    const [open, setOpen] = useState<boolean>(false);

    // Initialize form with default values that match your program structure
    const form = useForm<z.infer<typeof UpdateProgramSchema>>({
        resolver: zodResolver(UpdateProgramSchema),
        defaultValues: {
            description: program?.description || "",
            name: program?.name || "",
            capacity: program?.capacity || 0,
            minAge: program?.minAge || 0,
            maxAge: program?.maxAge || 0,
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
            });
        }
    }, [program, open]);

    async function submitForm(v: z.infer<typeof UpdateProgramSchema>) {
        setLoading(true);
        try {
            await sleep(2000);
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/programs/${pid}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(v)
                })
            );

            if(result?.status === 403) {
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
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={"ghost"} size={"icon"} className="size-6 bg-foreground/5 rounded-md">
                    <Pencil className="size-3" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Update Program</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(submitForm)} className='space-y-4'>
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
                                        <FormLabel size={"tiny"}>Program Description</FormLabel>
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
                </DialogBody>
                <DialogFooter>
                    <Button
                        onClick={form.handleSubmit(submitForm)}
                        variant={"foreground"}
                        size={"sm"}
                        disabled={loading || !form.formState.isValid}
                        className={cn("children:hidden", loading && "children:inline-block")}
                    >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}