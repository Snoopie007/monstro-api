"use client"
import { ResetPasswordSchema } from '@/libs/FormSchemas/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input
} from "@/components/forms";
import { cn, tryCatch } from '@/libs/utils';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ResetPasswordForm({ token }: { token: string }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const form = useForm<z.infer<typeof ResetPasswordSchema>>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            token: token,
            password: "",
            confirmPassword: "",
        },
        mode: "onChange",
    });

    async function onSubmit(v: z.infer<typeof ResetPasswordSchema>) {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch("/api/auth/password/reset", {
                method: "POST",
                body: JSON.stringify(v)
            })
        )
        setLoading(false);
        const data = await result?.json()
        if (!result || error || !result.ok) {
            toast.error(data?.error || error?.message || "Something went wrong")
            return
        }
        toast.success("Password reset successfully")
        setSuccess(true)
    }

    return (

        <div className="space-y-3 p-4">
            {success ? (
                <div className="space-y-2">
                    <div className="space-y-2">
                        <h1 className="text-lg  font-bold">
                            You're all set!
                        </h1>
                        <p className="text-sm text-gray-500">
                            Your password has been reset successfully. You can now login to your account.

                        </p>
                    </div>
                    <Button size="sm" asChild>
                        <Link href={`/login`}>Login</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    <div>
                        <h1 className="text-lg  font-bold">
                            Set your new password
                        </h1>
                        <p className="text-sm text-gray-500">
                            Create a new password and reset your account. Your reset link is valid for 30 minutes.
                        </p>
                    </div>

                    <div className="space-y-4 ">
                        <Form {...form}>
                            <form className="space-y-1">
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size="tiny">New Password</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="bg-white border border-gray-200 rounded-sm py-4 px-4 text-sm " type="password" placeholder="••••••••" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>
                                <fieldset>
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel size="tiny">Confirm New Password</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="bg-white border border-gray-200 rounded-sm py-4 px-4 text-sm " type="password" placeholder="••••••••" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </fieldset>

                            </form>
                        </Form>
                        <fieldset>
                            <Button type="submit"
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={loading}
                                className={cn("children:hidden", loading && "children:block")}

                            >
                                <Loader2 className="size-4 animate-spin mr-2" />
                                Update Password
                            </Button>
                        </fieldset>
                    </div>

                </div>
            )}

        </div>
    )
}
