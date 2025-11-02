'use client'
import {
    Form,
    FormField,
    FormLabel,
    FormControl,
    FormItem,
    FormMessage,
    Input,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpdatePasswordSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useState } from "react";

import {
    Dialog, DialogClose, DialogTitle,
    DialogDescription, DialogTrigger, DialogContent,
    DialogHeader,
    DialogFooter,
    Button,
    DialogBody
} from "@/components/ui";


export function UpdatePassword({ locationId }: { locationId: string }) {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof UpdatePasswordSchema>>({
        resolver: zodResolver(UpdatePasswordSchema),
        defaultValues: {
            confirmPassword: "",
            password: "",
            currentPassword: ""
        }
    })
    async function handleSubmit(v: z.infer<typeof UpdatePasswordSchema>) {


        setLoading(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/config/password`, {
                method: "PUT",
                body: JSON.stringify(v)
            })
        )

        setLoading(false)
        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again.")
        }

        if (result?.ok) {
            toast.success("Password updated successfully.")
        }

    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"foreground"} size={"sm"}>
                    <span>Update Your Password</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="p-4 space-y-0 gap-0">
                    <DialogTitle >Update Your Password</DialogTitle>
                    <DialogDescription className="hidden">

                    </DialogDescription>

                </DialogHeader>

                <DialogBody>
                    <Form {...form}>
                        <form className="space-y-2">
                            <fieldset>
                                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            Current Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </fieldset>
                            <fieldset>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            New Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </fieldset>
                            <fieldset>
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem className="flex-1 mt-0">
                                        <FormLabel size="tiny">
                                            Confirm Password
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="password" className="rounded-sm" placeholder="••••••••" {...field} />
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
                        <Button variant={"outline"} size={"sm"}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={form.handleSubmit(handleSubmit)}
                        variant={"foreground"}
                        size={"sm"}
                        className={cn("children:hidden", loading && "children:inline-block")}
                        type="submit"
                    >
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
