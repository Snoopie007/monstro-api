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



    const InputStyle = "bg-white border border-gray-200 rounded-lg h-12 text-base";

    return (
        <div className="space-y-4 flex flex-col">
            <div className="space-y-1">
                <h1 className="text-lg font-bold">
                    Welcome back!
                </h1>
                <p className="text-gray-500">
                    Sign in to Monstro-X to have some fun! Let's go!
                </p>
            </div>
            <fieldset>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input
                                    type="email"
                                    className={InputStyle}
                                    placeholder="Email"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset className="space-y-0.5">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input
                                    type="password"
                                    className={InputStyle}
                                    placeholder="Password"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />

            </fieldset>

            <div className="justify-start space-y-1">
                <Button
                    size="lg"
                    className={cn(
                        "children:hidden  bg-indigo-600 text-white ",
                        { "children:inline-block": loading }
                    )}
                    disabled={loading}
                    onClick={verifyEmailAndPassword}
                >
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Login
                </Button>
                <div className='text-gray-500'>
                    <span className="text-gray-500">Don't have an account? {` `}</span>
                    <Link href={"/join"} className={"inline-flex text-indigo-500  font-bold"} >
                        Create account
                    </Link>
                    <span className="text-gray-500">
                        .{` `} Trouble logging in? {` `}
                    </span>
                    <Link href={"/login/forgot"} className=" text-indigo-500  font-bold">
                        Reset your password.
                    </Link>
                </div>
            </div>

        </div>
    )
}
