import {
    Collapsible,
    CollapsibleContent,

} from '@/components/ui'
import { FormField, FormItem, FormLabel, FormMessage, FormControl, Input, RegionSelect } from '@/components/forms'
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { CreateMemberSchema } from '../schema';
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { StripeCardOptions } from '@/libs/utils';
import { useTheme } from 'next-themes';
interface NewMemberPaymentFormProps {
    form: UseFormReturn<z.infer<typeof CreateMemberSchema>>;
}

export default function NewMemberPaymentForm({ form }: NewMemberPaymentFormProps) {


    const { theme } = useTheme();
    const stripe = useStripe();
    const elements = useElements();



    async function handleCardChange(event: any) {

        if (event.complete) {
            if (!elements || !stripe) return;

            const tokenRef = await stripe.createToken(elements.getElement(CardElement)!);
            if (tokenRef.token) {
                form.setValue('billing.tokenId', tokenRef.token.id)
            }
        }
    }

    return (
        <div className='bg-foreground/5 p-4 rounded-sm mt-4 space-y-2'>
            <fieldset>
                <FormField
                    control={form.control}
                    name="billing.name"
                    render={({ field }) => (
                        <FormItem>

                            <FormLabel size='tiny'>Name on card</FormLabel>
                            <FormControl>
                                <Input type='text' className='w-full border-none' placeholder="Name on card" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset>
                <FormField
                    control={form.control}
                    name="billing.address_line1"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel size="tiny">
                                Billing Address
                            </FormLabel>

                            <FormControl>
                                <Input type="text" placeholder="Billing Address" className=" border-none rounded-sm  p-3 w-full" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />


            </fieldset>
            <fieldset className="grid grid-cols-3 items-center gap-2">
                <FormField
                    control={form.control}
                    name="billing.address_city"
                    render={({ field }) => (
                        <FormItem className="col-span-1">

                            <FormControl>
                                <Input type="text" className="border-none  rounded-sm" placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem >
                    )}
                />
                <FormField
                    control={form.control}
                    name="billing.address_state"
                    render={({ field }) => (
                        <FormItem className="col-span-1">

                            <FormControl>
                                <RegionSelect value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem >
                    )}
                />
                <FormField
                    control={form.control}
                    name="billing.address_zip"
                    render={({ field }) => (
                        <FormItem className="col-span-1">

                            <FormControl>
                                <Input type="text" className="border-none rounded-sm" placeholder="Zipcode" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            <fieldset >
                <FormItem className="flex-1">
                    <FormLabel size='tiny'>
                        Card Info
                    </FormLabel>
                    <CardElement
                        className=" bg-background  rounded-sm  p-3 w-full"
                        options={{
                            ...StripeCardOptions,
                            hidePostalCode: true,
                            style: {
                                base: {
                                    color: theme === "dark" ? "#fff" : "#000",
                                    iconColor: theme === "dark" ? "#fff" : "#000",
                                }
                            }
                        }}


                        onChange={handleCardChange}
                    />
                    <FormMessage />

                </FormItem>
            </fieldset>
        </div>
    )
}
