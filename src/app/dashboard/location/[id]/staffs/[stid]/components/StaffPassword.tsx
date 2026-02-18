'use client'
import {
    Form, FormField, FormItem,
    PasswordField, FormControl, FormMessage, Input
} from "@/components/forms";
import { Staff } from "@subtrees/types";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { UpdatePasswordSchema } from "@/libs/FormSchemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface StaffPasswordProps {
    staff: Staff;
    lid: string;
}

export function StaffPassword({ staff, lid }: StaffPasswordProps) {
    const form = useForm<z.infer<typeof UpdatePasswordSchema>>({
        resolver: zodResolver(UpdatePasswordSchema),
        defaultValues: {
            confirmPassword: "",
            password: "",
            currentPassword: ""
        }
    });

    async function handleSubmit(v: z.infer<typeof UpdatePasswordSchema>) {
        if (form.formState.isSubmitting) return;
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/staffs/${staff.id}/password`, {
                method: "PATCH",
                body: JSON.stringify(v)
            })
        );
        if (error || !result || !result.ok) {
            toast.error("Failed to update password");
            return;
        }
        toast.success("Password updated successfully");
        form.reset();
    }

    return (
        <div className="bg-foreground/5 rounded-lg">
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Change Password</div>
                    <p className="text-sm text-muted-foreground">
                        Update your password. Enter your current password and new password.
                    </p>
                </div>
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
            </div>
        </div>
    );
}