import React, { useState } from 'react'
import {
    FormField, FormItem, FormControl, FormLabel,
    RadioGroup,
    RadioGroupItem,
} from '@/components/forms'
import { LoginSchema } from '@/libs/schemas'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui'
import { cn, formatEmail, formatPhone, tryCatch } from '@/libs/utils'
import { useLoginStatus } from '../../login/providers/LoginStatusProvider'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'


export default function TypeFields({ form }: { form: UseFormReturn<z.infer<typeof LoginSchema>> }) {
    const { user, setStep } = useLoginStatus();
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
            <div className='space-y-0'>
                <div className='text-lg font-bold'>Send verification to</div>
                <p className='text-sm text-muted-foreground'>
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
                                            <FormLabel className="w-full space-x-2 border border-gray-200 px-4 py-3 cursor-pointer rounded-sm font-normal leading-none ">

                                                <FormControl>
                                                    <RadioGroupItem value={type} className='border-black ' />
                                                </FormControl>

                                                {type === 'email' ? formatEmail(user?.email || '') : formatPhone(user?.phone || '')}


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
                <Button onClick={handleGetToken} disabled={loading}
                    className={cn("children:hidden", loading && "children:block")}
                >
                    <Loader2 className='size-4 mr-2 animate-spin' />
                    Continue
                </Button>


            </fieldset>
        </div>
    )
}
