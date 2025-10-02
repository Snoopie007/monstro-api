"use client"
import React, { useState } from 'react'
import {
    FormField, FormItem, FormControl, FormLabel,
    RadioGroup,
    RadioGroupItem,
} from '@/components/forms'
import { LoginSchema } from '@/libs/FormSchemas/schemas'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui'
import { cn, formatEmail, formatPhone, tryCatch } from '@/libs/utils'
import { useLogin } from '../../providers'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'


export function TypeFields({ form }: { form: UseFormReturn<z.infer<typeof LoginSchema>> }) {
    const { user, setStep } = useLogin();
    const [loading, setLoading] = useState(false);

    async function handleGetToken() {
        setLoading(true);

        const { result, error } = await tryCatch(fetch(`/api/auth/login/token`, {
            method: 'POST',
            body: JSON.stringify({
                user,
                type: form.getValues('type')
            }),
        }));

        const data = await result?.json();
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error(data?.message || error?.message || 'Something went wrong. Please contact support at support@monstro.com.');
            return;
        }


        setStep(3);
    }

    return (
        <div className='space-y-6 '>
            <div className=' mb-4 space-y-1'>
                <div className='text-2xl font-bold'>Send verification to</div>
                <p className='text-gray-500'>
                    Select either email or phone to verify your account.
                </p>
            </div>
            <fieldset>
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem >

                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-0"
                                >
                                    {['email', 'sms'].map((type) => (
                                        <FormItem key={type} className='w-full flex '>
                                            <FormLabel className="w-full space-x-2 border flex items-center border-gray-200 p-4 cursor-pointer rounded-lg  ">

                                                <FormControl>
                                                    <RadioGroupItem value={type} className='border-gray-300 ' />
                                                </FormControl>

                                                <span className='leading-none'>
                                                    {type === 'email' ? formatEmail(user?.email || '') : formatPhone(user?.phone || '')}
                                                </span>


                                            </FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset >
                <Button
                    size="lg"
                    onClick={handleGetToken}
                    disabled={loading}
                    className={cn("children:hidden", loading && "children:block")}
                >
                    <Loader2 className='size-4 mr-2 animate-spin' />
                    Continue
                </Button>


            </fieldset>
        </div>
    )
}
