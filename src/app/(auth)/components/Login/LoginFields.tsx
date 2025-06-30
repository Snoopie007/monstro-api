"use client"
import React, { useState } from 'react'
import {
    FormControl,
    FormField, FormItem, FormLabel, FormMessage,
    Input,
} from '@/components/forms'
import Link from 'next/link'
import { cn, tryCatch } from '@/libs/utils'
import { LoginSchema } from '@/libs/FormSchemas/schemas'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { toast } from 'react-toastify';
import { useLogin } from '../../providers'

interface LoginFieldsProps {
    form: UseFormReturn<z.infer<typeof LoginSchema>>;
}

export function LoginFields({ form }: LoginFieldsProps) {
    const [loading, setLoading] = useState(false);
    const { setStep, setUser } = useLogin();

    async function verifyEmailAndPassword() {

        const isValid = await form.trigger(['email', 'password']);
        if (!isValid) return;
        setLoading(true);

        const { email, password } = form.getValues();

        const { result, error } = await tryCatch(fetch(`/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }));

        setLoading(false);
        const data = await result?.json();
        if (error || !result || !result.ok) {

            toast.error(data?.error || error?.message || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }
        const { user } = data;
        setUser(user);
        setStep(2);
    }



    return (
        <div className='space-y-4'>
            <div className='space-y-1'>
                <h1 className="text-lg font-bold ">
                    Sign in to Monstro
                </h1>
            </div>
            <fieldset >
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className='text-[0.65rem] font-semibold  uppercase'>
                                Email
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    className={"bg-white border border-gray-200 rounded-sm py-4 px-4 text-sm  "}
                                    placeholder="Your email"
                                    {...field}
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset >
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex flex-row justify-between">
                                <span className="text-[0.65rem] font-semibold  uppercase">Password</span>
                                <Link href={"/login/forgot"} className={"font-semibold text-[0.65rem]  uppercase"}					>
                                    Forgot your password?
                                </Link>

                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    className={"bg-white border border-gray-200  rounded-sm p-4 text-sm shadow-none"}
                                    placeholder="••••••••"
                                    {...field}
                                />
                            </FormControl>

                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />

            </fieldset>
            <fieldset>
                <Button
                    className={cn(
                        "w-full bg-indigo-600 text-white children:hidden",
                        { "children:inline-block": loading }
                    )}
                    disabled={loading}
                    onClick={verifyEmailAndPassword}
                >
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Login
                </Button>


            </fieldset>
        </div>
    )
}
