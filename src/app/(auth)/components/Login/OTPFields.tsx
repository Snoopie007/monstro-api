"use client"
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/forms'
import { Button } from '@/components/ui/button'
import React from 'react'
import { formatEmail, formatPhone } from '@/libs/utils'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormControl, FormField } from '@/components/forms'
import { FormItem } from '@/components/forms'
import { UseFormReturn } from 'react-hook-form'
import { toast } from 'react-toastify'
import { signIn } from '@/hooks/useSession'
import { Loader2 } from 'lucide-react'
import { OTPRetry } from './OTPRetry'
import { LoginSchema } from '@/libs/FormSchemas/schemas'
import { useLogin } from '../../providers'

interface VerifyOTPProps {
    form: UseFormReturn<z.infer<typeof LoginSchema>>;
}

export function VerifyOTP({ form }: VerifyOTPProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useLogin();
    const { type, ...rest } = form.getValues();


    async function onSubmit(v: z.infer<typeof LoginSchema>) {

        const { token } = v;
        if (!token || token.length !== 6) {
            form.setError("token", { message: "Invalid token" });
            return;
        }

        const res = await signIn("credentials", {
            redirect: false,
            ...v,
        });

        if (res?.error) {

            toast.error(res.code || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }
        const redirect = searchParams.get('redirect');
        const redirectUrl = redirect ? decodeURIComponent(redirect) : '/dashboard/locations';

        router.push(redirectUrl);
    }

    return (
        <div className="space-y-4">

            <div className="space-y-1  mb-4">
                <div className="text-2xl font-bold">
                    Authenticate your identity
                </div>
                <p className="text-gray-500">
                    {type === 'sms' 
                        ? `We've sent a text message to ${formatPhone(user?.phone || '')}` 
                        : `We've sent an email to ${formatEmail(rest.email)}`
                    }. The code will expire in 30 minutes.
                </p>
            </div>
            <div className="flex flex-col gap-2 space-y-1">
                <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                        <FormItem className="flex ">
                            <FormControl>
                                <InputOTP maxLength={6} {...field}>
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <InputOTPGroup key={index}>
                                            <InputOTPSlot index={index} className='border-gray-300 [&>div>div]:bg-gray-300' />
                                        </InputOTPGroup>
                                    ))}
                                </InputOTP>
                            </FormControl>
                        </FormItem>
                    )} />
                <OTPRetry type={type} />
            </div>
            <div className="flex ">
                <Button
                    size="lg"
                    disabled={form.formState.isSubmitting || !form.formState.isValid}
                    onClick={form.handleSubmit(onSubmit)}
                >
                    {form.formState.isSubmitting ? <Loader2 className=" size-4 animate-spin" /> : "Verify"}
                </Button>
            </div>
        </div>
    )
}
