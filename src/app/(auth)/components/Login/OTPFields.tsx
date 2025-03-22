
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/forms'
import { Button } from '@/components/ui/button'
import React, { useState } from 'react'
import { sleep, cn } from '@/libs/utils'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { FormControl, FormField } from '@/components/forms'
import { FormItem } from '@/components/forms'
import { UseFormReturn } from 'react-hook-form'
import { toast } from 'react-toastify'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import OTPRetry from './OTPRetry'
import { LoginSchema } from '@/libs/schemas'
import { useLoginStatus } from '../../login/providers/LoginStatusProvider'

interface VerifyOTPProps {
    form: UseFormReturn<z.infer<typeof LoginSchema>>;
}



export default function VerifyOTP({ form }: VerifyOTPProps) {

    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { location } = useLoginStatus();
    const { type, ...rest } = form.getValues();


    async function onSubmit(v: z.infer<typeof LoginSchema>) {

        const { token } = v;
        if (!token || token.length !== 6) {
            form.setError("token", { message: "Invalid token" });
            return;
        }

        setLoading(true);

        const res = await signIn("credentials", {
            redirect: false,
            ...v,
        });


        if (res?.error) {
            setLoading(false)
            toast.error(res.code || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }

        let redirect = '/onboarding';
        if (location) {
            redirect = location?.status === "incomplete" ? `/onboarding/${location.id}` : `/dashboard/${location.id}`
        }

        return router.push(redirect);

    }

    return (
        <div className="space-y-4">

            <div className="space-y-1">
                <div className="text-base font-medium">
                    Authenticate your identity
                </div>
                <p className="text-sm text-gray-500">
                    We've sent you an email to {rest.email}. The code will expire in 30 minutes.
                </p>
            </div>
            <div className="flex flex-col gap-2">
                <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                        <FormItem>
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
            <div className="">
                <Button
                    disabled={form.formState.isSubmitting || loading || !form.formState.isValid}
                    className={cn(
                        "children:hidden cursor-pointer ",

                        { "children:inline-block": loading })
                    }
                    onClick={form.handleSubmit(onSubmit)}
                >
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verify
                </Button>
            </div>
        </div>
    )
}
