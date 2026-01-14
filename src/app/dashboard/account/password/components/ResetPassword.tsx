'use client'
import {
    Form,
    FormField,
    FormControl,
    FormItem,
    FormMessage,
    Input,
    PasswordField,
} from "@/components/forms";
import { cn, tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpdatePasswordSchema } from "@/libs/FormSchemas";
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
            fetch(`/api/protected/account/settings/${userId}/password`, {
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
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-3"
                >
                    <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                            <FormItem>

                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Current Password"
                                        className="text-base"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>

                                <FormControl>
                                    <PasswordField
                                        placeholder="New Password"
                                        className="bg-background border border-foreground/10 rounded-lg"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>

                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        className="text-base "
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end py-2">
                        <Button
                            type="submit"
                            variant="foreground"
                            disabled={form.formState.isSubmitting || !form.formState.isValid}
                        >
                            {form.formState.isSubmitting ? <Loader2 className="animate-spin size-4" /> : "Update Password"}
                        </Button>
                    </div>
                </form>
            </Form>
            <div className=" flex justify-end">
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
