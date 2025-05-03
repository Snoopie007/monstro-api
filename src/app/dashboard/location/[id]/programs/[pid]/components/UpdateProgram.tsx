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
import { Loader2 } from "lucide-react";
import { useProgram } from "@/hooks/usePrograms";
import { toast } from "react-toastify";
import { UpdateProgramSchema } from "../../schemas";

export interface UpdateProgramProps {
    programId: number,
    locationId: string
}
export function UpdateProgram({ programId, locationId }: UpdateProgramProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const { program, mutate } = useProgram(locationId, programId);
    const [open, setOpen] = useState<boolean>(false);
    const form = useForm<z.infer<typeof UpdateProgramSchema>>({
        resolver: zodResolver(UpdateProgramSchema),
        defaultValues: {
            description: "",
            name: "",
            capacity: 0,
            minAge: 0,
            maxAge: 0,
        },
        mode: "onChange",
    });

    useEffect(() => {
        form.reset({
            description: program.description,
            name: program.name
        })
    }, [program])

    async function submitForm(v: z.infer<typeof UpdateProgramSchema>) {
        setLoading(true)
        try {
            await sleep(2000)
            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/location/${locationId}/programs/${programId}`, {
                    method: 'PUT',
                    body: JSON.stringify(v)
                })
            )
            if (!error || !result || !result.ok) {
                toast.error("Error updating the program, please try again.")

                return
            }

            const data = await result.json()
            mutate({ ...program, ...data })
            toast.success("Program updated successfully")
        } catch (error) {
            toast.error("Error updating the program, please try again.")

        } finally {
            setOpen(false)
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-transparent rounded-none text-foreground hover:bg-accent border-l">Edit</Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Update Program</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form {...form}>
                        <form className='' >
                            <fieldset>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="mb-4">
                                            <FormLabel size={"tiny"}>Program Name</FormLabel>
                                            <FormControl>
                                                <Input type='text' className={cn("")} placeholder="Program Name" {...field} />
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
                                                    className="resize-none border "
                                                    {...field}
                                                />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <fieldset className='flex flex-row items-center gap-2  w-full'>

                                    <FormField
                                        control={form.control}
                                        name="capacity"
                                        render={({ field }) => (
                                            <FormItem >
                                                <FormLabel size={"tiny"}>Capacity</FormLabel>
                                                <FormControl>
                                                    <Input type='number' className={cn()} placeholder={'Capacity'}  {...field} />
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
                                                    <Input type='number' className={cn()} placeholder={'Min Age'} {...field} />
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
                                                    <Input type='number' className={cn()} placeholder={'Max Age'} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>

                                        )}
                                    />
                                </fieldset>
                            </fieldset>
                        </form>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={form.handleSubmit(submitForm)}
                        variant={"foreground"}
                        size={"sm"}
                        disabled={loading || !form.formState.isValid || form.formState.isSubmitting}
                        className={cn("children:hidden", (loading && "children:inline-block"))}>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>

        </Dialog>
    )
}