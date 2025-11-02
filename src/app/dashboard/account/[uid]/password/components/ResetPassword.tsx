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


import { Button } from "@/components/ui";


export function ResetPassword({ userId }: { userId: string }) {

    const form = useForm<z.infer<typeof UpdatePasswordSchema>>({
        resolver: zodResolver(UpdatePasswordSchema),
        defaultValues: {
            confirmPassword: "",
            password: "",
            currentPassword: ""
        }
    })

    async function handleSubmit(v: z.infer<typeof UpdatePasswordSchema>) {
        if (form.formState.isSubmitting) return;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/account/${userId}/password`, {
                method: "PATCH",
                body: JSON.stringify(v)
            })
        )

        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again.")
        }

        if (result?.ok) {
            toast.success("Password updated successfully.")
        }

    }
    return (
        <div className="bg-foreground/5 rounded-lg">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 p-4">
                    <fieldset>
                        <FormField control={form.control} name="currentPassword" render={({ field }) => (
                            <FormItem className="flex-1 mt-0">

                                <FormControl>
                                    <Input type="password" placeholder="Current Password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </fieldset>
                    <fieldset>
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem className="flex-1 mt-0">

                                <FormControl>
                                    <Input type="password" placeholder="New Password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </fieldset>
                    <fieldset>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem className="flex-1 mt-0">

                                <FormControl>
                                    <Input type="password" placeholder="Confirm Password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </fieldset>
                </form>
            </Form>
            <div className="bg-foreground/5 py-3 px-4 flex justify-end">
                <Button
                    type="submit"
                    variant={"foreground"}
                    disabled={form.formState.isSubmitting || !form.formState.isValid}
                    onClick={form.handleSubmit(handleSubmit)}
                >
                    {form.formState.isSubmitting ? <Loader2 className=" h-4 w-4 animate-spin" /> : "Reset Password"}
                </Button>
            </div>
        </div>

    )
}
